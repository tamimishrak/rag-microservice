from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from loguru import logger

from app.agent.agent import Agent
from app.kafka.producer import kafka_producer
from app.kafka.consumer import kafka_consumer
from app.schemas.request_response import AgentQueryRequest, AgentQueryResponse

agent = Agent()

@asynccontextmanager
async def lifespan(app: FastAPI):
  logger.info("Starting Agent Service")
  await kafka_consumer.start()
  await kafka_producer.start()
  logger.info("Agent Service is ready and listening for messages")

  yield

  logger.info("Shutting Down Agent Service...")
  await kafka_consumer.stop()
  await kafka_producer.stop()
  logger.info("Shutdown complete")


app = FastAPI(
  title="Agent Service",
  version="0.1.0",
  lifespan=lifespan,
)

@app.get("/health")
async def health_check():
  return {"status": "ok", "service": "agent"}


@app.post("/api/v1/query", response_model=AgentQueryResponse)
async def query(request: AgentQueryRequest):
  try:
    result = await agent.run(
      user_id=str(request.userId),
      query=request.query,
      document_id=str(request.documentId) if request.documentId else None,
    )
    return AgentQueryResponse(**result)
  except Exception as e:
    logger.exception("Agent query failed")
    raise HTTPException(status_code=500, detail=str(e))