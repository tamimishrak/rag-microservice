from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from app.kafka.consumer import kafka_consumer
from app.kafka.producer import kafka_producer
from app.db.sessions import init_db, get_session
from app.schemas.search import SearchRequest, SearchResponse
from app.services.vector_search import vector_search_service


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


@app.post("/api/v1/search", response_model=SearchResponse)
async def search(
  request: SearchRequest,
  session: AsyncSession = Depends(get_session),
):
  try:
    chunks = await vector_search_service.search(
      session=session,
      user_id=request.userId,
      query=request.query,
      top_k=request.topK,
      document_id=request.documentId,
    )
    print(SearchResponse(chunks=chunks))
    return SearchResponse(chunks=chunks)
  except Exception as e:
    logger.exception("Search failed")
    raise HTTPException(status_code=500, detail=str(e))