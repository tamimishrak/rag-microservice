import json
from uuid import uuid4, UUID
from loguru import logger
from aiokafka import AIOKafkaProducer
from datetime import datetime, timezone

from app.core.config import settings
from app.kafka.topics import TOPIC_RESPONSE_GENERATED
from app.schemas.events import (
  ResponseGeneratedEvent, 
  ResponseGeneratedData, 
  ResponseStatus,
  MessageRole
)


class KafkaProducerService:
  def __init__(self):
    self.producer: AIOKafkaProducer | None = None
    
  async def start(self):
    self.producer = AIOKafkaProducer(
      bootstrap_servers=settings.kafka_bootstrap_servers,
      value_serializer=lambda v: json.dumps(v).encode("utf-8") 
    )
    
    await self.producer.start()
    logger.info("Kafka producer started")
    
  async def stop(self):
    if self.producer:
      await self.producer.stop()
      logger.info("Kafka producer stopped")
      
  async def publish_response_generated(
    self,
    *,
    conversation_id: UUID,
    user_id: UUID,
    message_id: UUID,
    status: ResponseStatus,
    document_id: UUID | None = None,
    role: MessageRole = MessageRole.ASSISTANT,
    content: str | None = None,
    model: str | None = None,
    retrieved_chunks: int | None = None,
    failure_reason: str | None = None,
  ) -> None:
    if not self.producer:
      raise RuntimeError("Kafka producer not started")

    event = ResponseGeneratedEvent(
      eventId=uuid4(),
      eventType=TOPIC_RESPONSE_GENERATED,
      timestamp=datetime.now(timezone.utc),
      version=1,
      data=ResponseGeneratedData(
        conversationId=conversation_id,
        userId=user_id,
        messageId=message_id,
        documentId=document_id,
        role=role,
        status=status,
        content=content,
        model=model,
        retrievedChunks=retrieved_chunks,
        failureReason=failure_reason,
      ),
    )

    await self.producer.send_and_wait(
      TOPIC_RESPONSE_GENERATED,
      key=str(conversation_id).encode("utf-8"),
      value=json.loads(event.model_dump_json()),
    )
    logger.info(f"Published response.generated ({status}) for conversation {conversation_id}")
      
kafka_producer = KafkaProducerService()