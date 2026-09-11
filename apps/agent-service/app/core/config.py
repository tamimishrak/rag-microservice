from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(
    env_file=".env",
    env_file_encoding="utf-8",
    extra="ignore"
  )

  # Kafka
  kafka_bootstrap_servers: str = "localhost:9093"
  kafka_consumer_group: str = "agent-service-group"

  # Kafka Topics
  topic_message_created: str = "message.created"
  topic_response_generated: str = "response.generated"

  # Database
  database_url: str = "postgresql+asyncpg://aiknowledgebaseapp:aiknowledgebase_password@localhost:5432/agent_db"

  # Knowledge Vector Service 
  knowledge_service_url: str = "http://localhost:8002"
  knowledge_service_search_path: str = "/api/v1/search"
  top_k: int = 5

  # LLM
  llm_provider: str = "ollama"  
  llm_model: str = "qwen2.5:7b"  
  llm_base_url: str = "http://localhost:11434"  
  llm_temperature: float = 0.7
  llm_max_tokens: int = 1024

settings = Settings()