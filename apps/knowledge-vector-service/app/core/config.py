from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
  model_config = SettingsConfigDict(
    env_file=".env",
    env_file_encoding="utf-8",
    extra="ignore"
  )

  # Kafka
  kafka_bootstrap_servers: str = "localhost:9093"
  kafka_consumer_group: str = "knowledge-service-group"

  # Kafka Topics
  topic_document_parsed: str = "document.parsed"
  topic_document_deleted: str = "document.deleted"
  topic_knowledge_ready: str = "knowledge.ready"

  # Vector Store Path 
  project_root: Path = Path(__file__).resolve().parents[4]
  vector_store_dir: Path = project_root / "vector_store"

  # Ollama Embeddings — must match document-parser-service's model
  ollama_base_url: str = "http://localhost:11434"
  embedding_model: str = "qwen3-embedding:0.6b"

  # Database
  database_url: str = "postgresql+asyncpg://aiknowledgebaseapp:aiknowledgebase_password@localhost:5432/knowledge_db"

  # Retrieval
  top_k: int = 5  

settings = Settings()