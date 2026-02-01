"""RAG pipeline configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from urllib.parse import urlparse

# Load .env so REDIS_URL, OPENAI_API_KEY, etc. are available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def _validate_redis_url(url: str) -> str:
    """Ensure REDIS_URL has a numeric port (not placeholder like PORT)."""
    if not url:
        return url
    parsed = urlparse(url)
    netloc = parsed.netloc or parsed.path
    if ":" in netloc:
        _, port_str = netloc.rsplit(":", 1)
        try:
            int(port_str)
        except ValueError:
            raise ValueError(
                f"REDIS_URL has invalid port {port_str!r}. "
                "Use a numeric port, e.g. 6379 or 10548, not the literal 'PORT'. "
                "Example: redis://default:PASSWORD@host.example.com:10548"
            )
    return url


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

    # Redis LLM cache (fast repeated queries; 0 = disable)
    cache_ttl: int = 3600

    @classmethod
    def from_env(cls) -> RAGConfig:
        """Build config from environment variables. REDIS_URL or REDIS_HOST+PORT+USERNAME+PASSWORD."""
        redis_url = os.getenv("REDIS_URL")
        if not redis_url or "YOUR_PASSWORD" in redis_url or "YOUR_REDIS_HOST" in redis_url:
            host = os.getenv("REDIS_HOST", "localhost")
            port = os.getenv("REDIS_PORT", "6379")
            user = os.getenv("REDIS_USERNAME", "default")
            pwd = os.getenv("REDIS_PASSWORD", "")
            redis_url = f"redis://{user}:{pwd}@{host}:{port}" if pwd else f"redis://{host}:{port}"
        _validate_redis_url(redis_url)
        return cls(
            redis_url=redis_url,
            index_name=os.getenv("RAG_INDEX_NAME", "rag_docs"),
            index_prefix=os.getenv("RAG_INDEX_PREFIX", "rag_docs"),
            embedding_model=os.getenv("RAG_EMBEDDING_MODEL", "text-embedding-3-small"),
            embedding_dimensions=int(os.getenv("RAG_EMBEDDING_DIMENSIONS", "1536")),
            chunk_size=int(os.getenv("RAG_CHUNK_SIZE", "1000")),
            chunk_overlap=int(os.getenv("RAG_CHUNK_OVERLAP", "200")),
            top_k=int(os.getenv("RAG_TOP_K", "5")),
            llm_model=os.getenv("RAG_LLM_MODEL", "gpt-4o-mini"),
            llm_temperature=float(os.getenv("RAG_LLM_TEMPERATURE", "0.0")),
            cache_ttl=int(os.getenv("RAG_CACHE_TTL", "3600")),
        )
