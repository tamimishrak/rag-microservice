import json
import asyncio
from aiokafka import AIOKafkaConsumer
from loguru import logger
from pydantic import ValidationError
from sqlmodel import select
from datetime import datetime, timezone

from app.core.config import settings
from app.agent.agent import Agent
from app.db.models import AgentRun
from app.db.session import get_session
from app.kafka.producer import kafka_producer
from app.kafka.topics import TOPIC_MESSAGE_CREATED, TOPIC_RESPONSE_GENERATED
from app.schemas.events import MessageCreatedEvent, MessageRole, ResponseStatus


class KafkaConsumerService:
  def __init__(self, agent: Agent):
    self.agent = agent
    self.consumer: AIOKafkaConsumer | None = None
    self._task: asyncio.Task | None = None
  
    
  async def start(self):
    self.consumer = AIOKafkaConsumer(
      TOPIC_MESSAGE_CREATED,
      TOPIC_RESPONSE_GENERATED,
      bootstrap_servers=settings.kafka_bootstrap_servers,
      group_id=settings.kafka_consumer_group,
      auto_offset_reset="earliest",
      enable_auto_commit=True,
      value_deserializer=lambda m: json.loads(m.decode("utf-8"))
    )
    
    await self.consumer.start()
    logger.info(f"Kafka consumer started... Listening to: {TOPIC_MESSAGE_CREATED}")
    
    self._task = asyncio.create_task(self._consume())
    
  async def stop(self): 
    if self._task:
      self._task.cancel()
      try:
        await self._task
      except asyncio.CancelledError:
        pass
    
    if self.consumer:
      await self.consumer.stop()
      logger.info("Kafka consumer stopped")
      
  async def _consume(self):
    try:
      async for message in self.consumer:
        try:
          raw_data = message.value
          logger.info(f"Recieved message: {raw_data}")

          event = MessageCreatedEvent.model_validate(raw_data)
          if event.data.role != MessageRole.USER:
            continue  

          await self._handle_message_created(event)
          
        except ValidationError as ve:
          logger.error(f"Invalid kafka event structure: {ve}")
        except Exception as e:
          logger.error(f"Error processing message!: {e}", exc_info=True)
    except asyncio.CancelledError:
      logger.info("Consumer loop cancelled")

  async def _handle_message_created(self, event: MessageCreatedEvent):
    data = event.data

    # Only process USER messages
    if data.role != MessageRole.USER:
      logger.info(f"Ignoring non-USER message {data.messageId}")
      return

    try:
      result = await self.agent.run(
        user_id=str(data.userId),
        query=data.content,
        document_id=str(data.documentId) if data.documentId else None,
      )

      await kafka_producer.publish_response_generated(
        conversation_id=data.conversationId,
        user_id=data.userId,
        message_id=data.messageId,
        document_id=data.documentId,
        role=MessageRole.ASSISTANT,
        status=ResponseStatus.COMPLETED,
        content=result["content"],
        model=result["model"],
        retrieved_chunks=result.get("retrievedChunks"),
      )

    except Exception as e:
      logger.error(f"Agent run failed for message {data.messageId}: {e}", exc_info=True)

      await kafka_producer.publish_response_generated(
        conversation_id=data.conversationId,
        user_id=data.userId,
        message_id=data.messageId,
        document_id=data.documentId,
        role=MessageRole.ASSISTANT,
        status=ResponseStatus.FAILED,
        failure_reason="Failed to generate a response. Please try again.",
      )

agent = Agent()
kafka_consumer = KafkaConsumerService(agent=agent)