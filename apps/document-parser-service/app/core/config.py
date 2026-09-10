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
  kafka_consumer_group: str = "document-parser-group"
  
  # Kafka Topics
  topic_document_created: str = "document.created"
  topic_document_parsed: str = "document.parsed"
  
  # Shared Upload Folder Path
  project_root: Path = Path(__file__).resolve().parents[4]
  uploads_dir: Path = project_root / "uploads" / "documents"
  vector_store_dir: Path = project_root / "vector_store"
  
  # Ollama Embeddings
  ollama_base_url: str = "http://localhost:11434"
  embedding_model: str = "qwen3-embedding:0.6b"
  
  # Chunking
  chunk_size: int = 1000
  chunk_overlap: int = 200
  
settings = Settings()