import httpx
from loguru import logger

from app.core.config import settings
from app.schemas.search import SearchRequest, SearchResponse, RetrievedChunk


class Agent:
  def __init__(self):
    self.knowledge_service_url = settings.knowledge_service_url.rstrip("/") + settings.knowledge_service_search_path

  async def _retrieve_chunks(
    self,
    user_id: str,
    query: str,
    document_id: str | None = None,
  ) -> list[RetrievedChunk]:
    request = SearchRequest(
      userId=user_id,
      documentId=document_id,
      query=query,
      topK=settings.top_k,
    )

    async with httpx.AsyncClient(timeout=15.0) as client:
      response = await client.post(
        self.knowledge_service_url,
        json=request.model_dump(mode="json"),
      )
      response.raise_for_status()

    search_response = SearchResponse.model_validate(response.json())
    logger.info(f"Retrieved {len(search_response.chunks)} chunk(s) for query")
    return search_response.chunks

  def _build_prompt(self, query: str, chunks: list[RetrievedChunk]) -> str:
    if not chunks:
      context = "No relevant context was found."
    else:
      context = "\n\n".join(
        f"[Source: {chunk.fileName}]\n{chunk.content}" for chunk in chunks
      )

    return (
      "You are a helpful assistant answering questions based on the provided document context.\n"
      "Only use the context below to answer. If the answer isn't in the context, say so honestly.\n\n"
      f"Context:\n{context}\n\n"
      f"Question: {query}\n\n"
      "Answer:"
    )

  async def _generate(self, prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
      response = await client.post(
        f"{settings.llm_base_url}/api/generate",
        json={
          "model": settings.llm_model,
          "prompt": prompt,
          "stream": False,
          "options": {
            "temperature": settings.llm_temperature,
          },
        },
      )
      response.raise_for_status()

    data = response.json()
    return data["response"]

  async def run(self, user_id: str, query: str, document_id: str | None = None) -> dict:
    chunks = await self._retrieve_chunks(user_id, query, document_id)
    prompt = self._build_prompt(query, chunks)
    answer = await self._generate(prompt)

    return {
      "content": answer,
      "model": settings.llm_model,
      "retrievedChunks": len(chunks),
    }