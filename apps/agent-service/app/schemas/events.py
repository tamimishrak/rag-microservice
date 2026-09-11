import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class MessageRole(str, Enum):
  USER = "USER"
  ASSISTANT = "ASSISTANT"
  SYSTEM = "SYSTEM"


# Consumer: message.created from Conversation Service
class MessageCreatedData(BaseModel):
  messageId: uuid.UUID
  conversationId: uuid.UUID
  documentId: uuid.UUID
  userId: uuid.UUID
  content: str
  role: MessageRole


class MessageCreatedEvent(BaseModel):
  eventId: uuid.UUID
  eventType: str
  timestamp: datetime
  version: int
  data: MessageCreatedData


# Producer: response.generated to Conversation Service, Stats Service
class ResponseStatus(str, Enum):
  COMPLETED = "COMPLETED"
  FAILED = "FAILED"


class ResponseGeneratedData(BaseModel):
  conversationId: uuid.UUID
  userId: uuid.UUID
  messageId: uuid.UUID         
  documentId: Optional[uuid.UUID] = None
  role: MessageRole = MessageRole.ASSISTANT   
  status: ResponseStatus
  content: Optional[str] = Field(default=None, description="Generated response text, present on COMPLETED")
  model: Optional[str] = Field(default=None, description="LLM model used")
  retrievedChunks: Optional[int] = None
  failureReason: Optional[str] = Field(default=None, description="Reason for failure if status is FAILED")

class ResponseGeneratedEvent(BaseModel):
  eventId: uuid.UUID
  eventType: str
  timestamp: datetime
  version: int = 1
  data: ResponseGeneratedData