from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
  COMPLETED = "COMPLETED"
  FAILED = "FAILED"
  
# For incoming event coming from nestjs
class DocumentCreatedData(BaseModel):
  documentId: str = Field(..., description="UUID of the document record")
  userId: str = Field(..., description="UUID of the uploading user")
  fileName: str = Field(..., description="Original file name")
  filePath: str = Field(..., description="Path to the PDF file on disk")
  
  
class DocumentCreatedEvent(BaseModel):
  eventId: str
  eventType: str
  timestamp: str
  version: int
  data: DocumentCreatedData
  
# Outgoing event - Document and Knowledge Service
class DocumentParsedData(BaseModel):
  documentId: str
  userId: str
  status: DocumentStatus
  
  vectorCollection: Optional[str] = Field(
    default=None, 
    description="Name of the collection in ChromaDB"
  )
  totalChunks: Optional[int] = Field(
    default=None, 
    description="Total vector chunks generated"
  )
  embeddingModel: Optional[str] = Field(
    default=None, 
    description="Model used for generating embeddings"
  )
  
  # Error metadata (Populated on FAILED)
  failureReason: Optional[str] = Field(
    default=None, 
    description="Reason for failure if status is FAILED"
  )
  
class DocumentParsedEvent(BaseModel):
  eventId: str
  eventType: str
  timestamp: str
  version: int = 1
  data: DocumentParsedData