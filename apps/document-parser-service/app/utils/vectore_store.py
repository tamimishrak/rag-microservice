from pathlib import Path
from loguru import logger

from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings


class VectorStore:
  def __init__(self):
    self.embeddings = OllamaEmbeddings(
      model=settings.embedding_model,
      base_url=settings.ollama_base_url
    )
    
    self.text_splitter = RecursiveCharacterTextSplitter(
      chunk_size=settings.chunk_size,
      chunk_overlap=settings.chunk_overlap,
      length_function=len,
      add_start_index=True
    )
    
    settings.vector_store_dir.mkdir(parents=True, exist_ok=True)
    
  def _load_documents(self, file_path: str) -> list[Document]:
    path = Path(file_path)
    
    if not path.exists():
      raise FileNotFoundError(f"File not found: {file_path}")
    
    loader = PyPDFLoader(str(path))
    documents = loader.load()
    
    if not documents:
      raise ValueError(f"No content extracted from: {file_path}")
    
    logger.info(f"Loaded {len(documents)} page(s) from {path.name}")
    return documents
  
  def _split_documents(self, documents: list[Document]) -> list[Document]:
    chunks = self.text_splitter.split_documents(documents)
    logger.info(f"Split into {len(chunks)} chunk(s)")
    return chunks

  def _store_chunks(self, chunks: list[Document], collection_name: str) -> int:
    Chroma.from_documents(
      documents=chunks,
      embedding=self.embeddings,
      collection_name=collection_name,
      persist_directory=str(settings.vector_store_dir)
    )
    
    logger.info(f"Persisted {len(chunks)} chunk(s) to collection '{collection_name}'")
    return len(chunks)
  
  def process_document(self, file_path: str, document_id: str) -> dict:
    collection_name = f"doc_{document_id}"

    documents = self._load_documents(file_path)
    chunks = self._split_documents(documents)
    total_chunks = self._store_chunks(chunks, collection_name)

    return {
      "vectorCollection": collection_name,
      "totalChunks": total_chunks,
      "embeddingModel": settings.embedding_model,
    }