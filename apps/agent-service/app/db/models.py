import uuid
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, DateTime
from typing import Optional


class AgentRun(SQLModel, table=True):
  __tablename__ = "agent_runs"

  id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
  userId: uuid.UUID = Field(index=True, nullable=False)
  conversationId: uuid.UUID = Field(index=True, nullable=False)
  messageId: uuid.UUID = Field(nullable=False)          
  responseMessageId: Optional[uuid.UUID] = Field(default=None)  

  status: str = Field(default="PENDING")  # PENDING, RETRIEVING, GENERATING, COMPLETED, FAILED
  model: str = Field(nullable=False)
  error: Optional[str] = Field(default=None)

  startedAt: datetime = Field(
    default_factory=lambda: datetime.now(timezone.utc),
    sa_column=Column(DateTime(timezone=True))
    )
  completedAt: Optional[datetime] = Field(default=None)