import json
from loguru import logger
from aiokafka import AIOKafkaProducer

from app.core.config import settings
from app.schemas.events import KnowledgeReadyEvent


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
      
  async def publish_knowledge_ready(self, event: KnowledgeReadyEvent):
    if not self.producer:
      raise RuntimeError("Kafka producer not started")
    
    await self.producer.send_and_wait(
      settings.topic_knowledge_ready,
      value=event.model_dump(mode="json"),
    )
    
kafka_producer = KafkaProducerService()