import uuid
import json
from loguru import logger
from aiokafka import AIOKafkaProducer
from datetime import datetime, timezone

from app.core.config import settings
from app.kafka.topics import DOCUMENT_PARSED
from app.schemas.schema import DocumentParsedData, DocumentParsedEvent


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
  
  async def publish_parsed_document(self, data: DocumentParsedData):
    if not self.producer:
      raise RuntimeError("Producer not started")
    
    event = DocumentParsedEvent(
      eventId=str(uuid.uuid4()),
      eventType=DOCUMENT_PARSED,
      timestamp=datetime.now(timezone.utc).isoformat(),
      version=1,
      data=data
    )
    
    await self.producer.send_and_wait(
      DOCUMENT_PARSED,
      value=event.model_dump(mode="json")
    )
    
    logger.info(f"Published {DOCUMENT_PARSED} for documentId={data.documentId}")
    
    
kafka_producer = KafkaProducerService()