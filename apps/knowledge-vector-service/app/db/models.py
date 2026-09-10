import uuid
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, DateTime

class KnowledgeDocument(SQLModel, table=True):
  __tablename__ = "knowledge_documents"

  id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
  document_id: uuid.UUID = Field(index=True, unique=True, nullable=False)
  user_id: uuid.UUID = Field(index=True, nullable=False)
  file_name: str = Field(nullable=False)

  # ChromaDB reference — one collection per document
  vector_collection: str = Field(nullable=False)
  total_chunks: int = Field(default=0)
  embedding_model: str = Field(nullable=False)

  is_active: bool = Field(default=True, index=True)

  created_at: datetime = Field(
    default_factory=lambda: datetime.now(timezone.utc),
    sa_column=Column(DateTime(timezone=True))
  )
  updated_at: datetime = Field(
    default_factory=lambda: datetime.now(timezone.utc),
    sa_column=Column(DateTime(timezone=True))
  )