import uuid
from typing import Optional
from pydantic import BaseModel, Field


class AgentQueryRequest(BaseModel):
  userId: uuid.UUID
  query: str = Field(..., min_length=1)
  documentId: Optional[uuid.UUID] = None


class AgentQueryResponse(BaseModel):
  content: str
  model: str
  retrievedChunks: int