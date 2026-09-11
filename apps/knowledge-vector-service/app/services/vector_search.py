import uuid
from typing import Optional
from loguru import logger
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_chroma import Chroma
from langchain_core.documents import Document

from app.core.config import settings
from app.db.models import KnowledgeDocument
from app.schemas.search import RetrievedChunk
from app.services.embeddings import get_embeddings


class VectorSearchService:
  def __init__(self):
    self.embeddings = get_embeddings()
    self.persist_directory = str(settings.vector_store_dir)

  def _get_vectorstore(self, collection_name: str) -> Chroma:
    return Chroma(
      collection_name=collection_name,
      embedding_function=self.embeddings,
      persist_directory=self.persist_directory,
    )

  async def search(
    self,
    session: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    top_k: int = 5,
    document_id: Optional[uuid.UUID] = None,
  ) -> list[RetrievedChunk]:
    # 1. Find active documents for this user
    stmt = select(KnowledgeDocument).where(
      KnowledgeDocument.user_id == user_id,
      KnowledgeDocument.is_active == True,
    )
    if document_id is not None:
      stmt = stmt.where(KnowledgeDocument.document_id == document_id)

    result = await session.execute(stmt)
    docs = result.scalars().all()

    if not docs:
      logger.info(f"No active knowledge documents found for user={user_id}")
      return []

    all_chunks: list[RetrievedChunk] = []

    # 2. Search each relevant collection
    for doc in docs:
      try:
        vectorstore = self._get_vectorstore(doc.vector_collection)

        # similarity_search_with_score returns (Document, distance)
        results: list[tuple[Document, float]] = (
          vectorstore.similarity_search_with_score(query, k=min(top_k, doc.total_chunks or top_k))
        )

        for document, distance in results:
          # Convert distance → similarity score (higher is better)
          score = 1.0 / (1.0 + float(distance))

          all_chunks.append(
            RetrievedChunk(
              content=document.page_content,
              documentId=doc.document_id,
              fileName=doc.file_name,
              score=round(score, 4),
            )
          )
      except Exception as e:
        logger.warning(f"Failed to search collection {doc.vector_collection}: {e}")
        continue

    # 3. Global top-k across all collections
    all_chunks.sort(key=lambda c: c.score, reverse=True)
    return all_chunks[:top_k]


vector_search_service = VectorSearchService()