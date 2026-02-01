"""RAG pipeline configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

# Load .env so REDIS_URL, OPENAI_API_KEY, etc. are available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


@dataclass
class RAGConfig:
    """Configuration for the RAG pipeline."""

    # Redis / RedisVL
    redis_url: str = field(default_factory=lambda: os.getenv("REDIS_URL", "redis://localhost:6379"))
    index_name: str = "rag_docs"
    index_prefix: str = "rag_docs"

    # Embedding (OpenAI by default; dimensions must match model)
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536  # text-embedding-3-small

    # Chunking
    chunk_size: int = 1000
    chunk_overlap: int = 200

    # Retrieval
    top_k: int = 5
    score_threshold: float | None = None

    # LLM (for generation in LangGraph)
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.0

    @classmethod
    def from_env(cls) -> RAGConfig:
        """Build config from environment variables."""
        return cls(
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
            index_name=os.getenv("RAG_INDEX_NAME", "rag_docs"),
            index_prefix=os.getenv("RAG_INDEX_PREFIX", "rag_docs"),
            embedding_model=os.getenv("RAG_EMBEDDING_MODEL", "text-embedding-3-small"),
            embedding_dimensions=int(os.getenv("RAG_EMBEDDING_DIMENSIONS", "1536")),
            chunk_size=int(os.getenv("RAG_CHUNK_SIZE", "1000")),
            chunk_overlap=int(os.getenv("RAG_CHUNK_OVERLAP", "200")),
            top_k=int(os.getenv("RAG_TOP_K", "5")),
            llm_model=os.getenv("RAG_LLM_MODEL", "gpt-4o-mini"),
            llm_temperature=float(os.getenv("RAG_LLM_TEMPERATURE", "0.0")),
        )
