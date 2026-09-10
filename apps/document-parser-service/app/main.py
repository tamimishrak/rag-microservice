from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger

from app.kafka.consumer import kafka_consumer
from app.kafka.producer import kafka_producer

@asynccontextmanager
async def lifespan(app: FastAPI):
  logger.info("Starting Document Parser Service")
  await kafka_consumer.start()
  await kafka_producer.start()
  logger.info("Document Parser Service is ready and listening for messages")
  
  yield
  
  logger.info("Shutting Down Document Parser Service...")
  await kafka_consumer.stop()
  await kafka_producer.stop()
  logger.info("Shutdown complete")
  
app = FastAPI(
  title="Document Parser Service",
  version="0.1.0",
  lifespan=lifespan
)

@app.get("/health")
async def health_check():
  return {"status": "ok", "service": "document-parser"}