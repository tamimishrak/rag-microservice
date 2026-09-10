import json
import asyncio
from loguru import logger
from pydantic import ValidationError
from aiokafka import AIOKafkaConsumer

from app.core.config import settings
from app.kafka.topics import DOCUMENT_CREATED
from app.utils.vectore_store import VectorStore
from app.schemas.schema import DocumentCreatedEvent, DocumentParsedData, DocumentStatus
from app.kafka.producer import kafka_producer


class KafkaConsumerService:
  def __init__(self):
    self.consumer: AIOKafkaConsumer | None = None
    self._task: asyncio.Task | None = None
    self.vectore_store = VectorStore()
    
  async def start(self):
    self.consumer = AIOKafkaConsumer(
      DOCUMENT_CREATED,
      bootstrap_servers=settings.kafka_bootstrap_servers,
      group_id=settings.kafka_consumer_group,
      auto_offset_reset="earliest",
      enable_auto_commit=True,
      value_deserializer=lambda m: json.loads(m.decode("utf-8"))
    )
    
    await self.consumer.start()
    logger.info(f"Kafka consumer started... Listening to: {DOCUMENT_CREATED}")
    
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
          
          event = DocumentCreatedEvent.model_validate(raw_data)
          
          await self.handle_document_created(event)
          
        except ValidationError as ve:
          logger.error(f"Invalid kafka event structure: {ve}")
        except Exception as e:
          logger.error(f"Error processing message!: {e}", exc_info=True)
    except asyncio.CancelledError:
      logger.info("Consumer loop cancelled")
      
  async def handle_document_created(self, event: DocumentCreatedEvent):
    data = event.data
    
    try:
      result = await asyncio.to_thread(
        self.vectore_store.process_document,
        data.filePath,
        data.documentId
      )
      
      parsed_data = DocumentParsedData(
        documentId=data.documentId,
        userId=data.userId,
        fileName=data.fileName,
        status=DocumentStatus.COMPLETED,
        vectorCollection=result["vectorCollection"],
        totalChunks=result["totalChunks"],
        embeddingModel=result["embeddingModel"]
      )
      
    except Exception as e:
      logger.error(f"Failed to process document {data.documentId}: {e}", exc_info=True)
      parsed_data = DocumentParsedData(
        documentId=data.documentId,
        userId=data.userId,
        fileName=data.fileName,
        status=DocumentStatus.FAILED,
        failureReason=str(e),
      )
    logger.info(parsed_data)
    await kafka_producer.publish_parsed_document(parsed_data)
    
    
kafka_consumer = KafkaConsumerService()