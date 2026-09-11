import uuid
from typing import Optional, List
from pydantic import BaseModel


# Outgoing request TO Knowledge Vector Service 
class SearchRequest(BaseModel):
  userId: uuid.UUID
  documentId: Optional[uuid.UUID] = None   
  query: str
  topK: int = 5

#  Incoming response FROM Knowledge Vector Service 
class RetrievedChunk(BaseModel):
  content: str
  documentId: uuid.UUID
  fileName: str
  score: float


class SearchResponse(BaseModel):
  chunks: List[RetrievedChunk]