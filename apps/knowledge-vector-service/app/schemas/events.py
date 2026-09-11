# app/schemas/events.py
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
  COMPLETED = "COMPLETED"
  FAILED = "FAILED"


# Consumer: document.parsed from Document-service
class DocumentParsedData(BaseModel):
  documentId: uuid.UUID
  userId: uuid.UUID
  fileName: str
  status: DocumentStatus

  vectorCollection: Optional[str] = None
  vectorIds: Optional[List[str]] = Field(default_factory=list)
  totalChunks: Optional[int] = None
  embeddingModel: Optional[str] = None

  failureReason: Optional[str] = None


class DocumentParsedEvent(BaseModel):
  eventId: uuid.UUID
  eventType: str
  timestamp: datetime
  version: int
  data: DocumentParsedData


# Consumer: document.deleted from Document-service
class DocumentDeletedData(BaseModel):
  documentId: uuid.UUID
  userId: uuid.UUID


class DocumentDeletedEvent(BaseModel):
  eventId: uuid.UUID
  eventType: str
  timestamp: datetime
  version: int
  data: DocumentDeletedData


# Producer: knowledge.ready to Document Service + Stats Service

class KnowledgeStatus(str, Enum):
  READY = "READY"
  FAILED = "FAILED"


class KnowledgeReadyData(BaseModel):
  documentId: uuid.UUID
  userId: uuid.UUID
  status: KnowledgeStatus
  isActive: bool
  totalChunks: Optional[int] = None
  failureReason: Optional[str] = None


class KnowledgeReadyEvent(BaseModel):
  eventId: uuid.UUID
  eventType: str
  timestamp: datetime
  version: int = 1
  data: KnowledgeReadyData