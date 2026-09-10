import uuid
import json 
import asyncio
import chromadb
from loguru import logger
from pydantic import ValidationError
from aiokafka import AIOKafkaConsumer
from datetime import datetime, timezone

from sqlmodel import select

from app.db.models import KnowledgeDocument
from app.db.sessions import async_session_maker
from app.schemas.events import (
  DocumentStatus,
  DocumentParsedEvent,
  DocumentDeletedEvent,
  KnowledgeStatus,
  KnowledgeReadyData,
  KnowledgeReadyEvent
)
from app.core.config import settings
from app.kafka.producer import kafka_producer
from app.kafka.topics import TOPIC_DOCUMENT_DELETED, TOPIC_DOCUMENT_PARSED, TOPIC_KNOWLEDGE_READY
from app.schemas.events import DocumentDeletedEvent, DocumentParsedEvent, DocumentStatus


class KafkaConsumerService:
  def __init__(self):
    self.consumer: AIOKafkaConsumer | None = None
    self._task: asyncio.Task | None = None
    
  async def start(self):
    self.consumer = AIOKafkaConsumer(
      TOPIC_DOCUMENT_PARSED,
      TOPIC_DOCUMENT_DELETED,
      bootstrap_servers=settings.kafka_bootstrap_servers,
      group_id=settings.kafka_consumer_group,
      auto_offset_reset="earliest",
      enable_auto_commit=True,
      value_deserializer=lambda m: json.loads(m.decode("utf-8"))
    )
    
    await self.consumer.start()
    logger.info(f"Kafka consumer started... Listening to: {TOPIC_DOCUMENT_PARSED}")
    
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
          
          if message.topic == TOPIC_DOCUMENT_PARSED:
            event = DocumentParsedEvent.model_validate(raw_data)
            await self.handle_document_parsed(event)

          elif message.topic == TOPIC_DOCUMENT_DELETED:
            event = DocumentDeletedEvent.model_validate(raw_data)
            await self.handle_document_deleted(event)

          else:
            logger.warning(f"Unhandled topic: {message.topic}")
          
        except ValidationError as ve:
          logger.error(f"Invalid kafka event structure: {ve}")
        except Exception as e:
          logger.error(f"Error processing message!: {e}", exc_info=True)
    except asyncio.CancelledError:
      logger.info("Consumer loop cancelled")
      
  async def handle_document_parsed(self, event: DocumentParsedEvent):
    data = event.data
    
    if data.status == DocumentStatus.FAILED:
      logger.warning(f"Document {data.documentId} failed parsing: {data.failureReason}. Skipping indexing.")
      return
    
    try:
      async with async_session_maker() as session:
        knowledge_doc = KnowledgeDocument(
          document_id=data.documentId,
          user_id=data.userId,
          file_name=data.fileName,
          vector_collection=data.vectorCollection,
          total_chunks=data.totalChunks or 0,
          embedding_model=data.embeddingModel,
          is_active=True
        )
        
        session.add(knowledge_doc)
        await session.commit()
        
        logger.info(f"KnowledgeDocument saved for documentId={data.documentId}")

        ready_event = KnowledgeReadyEvent(
          eventId=uuid.uuid4(),
          eventType=TOPIC_KNOWLEDGE_READY,
          timestamp=datetime.now(timezone.utc),
          data=KnowledgeReadyData(
            documentId=data.documentId,
            userId=data.userId,
            status=KnowledgeStatus.READY,
            totalChunks=data.totalChunks
          ),
        )
        
        await kafka_producer.publish_knowledge_ready(ready_event)
        logger.info(f"Published knowledge.ready for documentId={event.data.documentId}")
    except Exception as e:
      logger.error(f"Failed to index document {data.documentId}: {e}", exc_info=True)

      ready_event = KnowledgeReadyEvent(
        eventId=uuid.uuid4(),
        eventType="knowledge.ready",
        timestamp=datetime.now(timezone.utc),
        data=KnowledgeReadyData(
          documentId=data.documentId,
          userId=data.userId,
          status=KnowledgeStatus.FAILED,
          failureReason=str(e),
        ),
      )
      
      await kafka_producer.publish_knowledge_ready(ready_event)
      logger.error(f"An error occured for documentId={event.data.documentId}, error = {e}")
      
      
  async def handle_document_deleted(self, event: DocumentDeletedEvent):
    data = event.data

    try:
      async with async_session_maker() as session:
        result = await session.exec(
          select(KnowledgeDocument).where(KnowledgeDocument.document_id == data.documentId)
        )
        knowledge_doc = result.first()

        if not knowledge_doc:
          logger.warning(f"KnowledgeDocument not found for documentId={data.documentId}. Skipping.")
          return

        chroma_client = chromadb.PersistentClient(path=str(settings.vector_store_dir))
        try:
          chroma_client.delete_collection(name=knowledge_doc.vector_collection)
          logger.info(f"Deleted Chroma collection: {knowledge_doc.vector_collection}")
        except Exception as chroma_err:
          logger.warning(f"Chroma collection delete failed (may not exist): {chroma_err}")

        knowledge_doc.is_active = False
        knowledge_doc.updated_at = datetime.now(timezone.utc)
        session.add(knowledge_doc)
        await session.commit()

      logger.info(f"KnowledgeDocument marked inactive for documentId={data.documentId}")

    except Exception as e:
      logger.error(f"Failed to process document.deleted for {data.documentId}: {e}", exc_info=True)
    
kafka_consumer = KafkaConsumerService()