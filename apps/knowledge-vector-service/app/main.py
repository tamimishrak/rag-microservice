from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger

from app.kafka.consumer import kafka_consumer
from app.kafka.producer import kafka_producer
from app.db.sessions import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
  logger.info("Starting Knowledge Vector Service")
  await init_db()
  await kafka_consumer.start()
  await kafka_producer.start()
  logger.info("Knowledge Vector Service is ready and listening for messages")
  
  yield
  
  logger.info("Shutting Down Knowledge Vector Service...")
  await kafka_consumer.stop()
  await kafka_producer.stop()
  logger.info("Shutdown complete")
  
app = FastAPI(
  title="Knowledge Vector Service",
  version="0.1.0",
  lifespan=lifespan
)

@app.get("/health")
async def health_check():
  return {"status": "ok", "service": "knowledge-vector"}