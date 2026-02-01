"""Retrieval: vector search over RedisVL index and conversion to LangChain documents."""

from __future__ import annotations

from typing import Any

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from redis import Redis
from redisvl.index import SearchIndex
from redisvl.query import VectorQuery

from .config import RAGConfig
from .ingestion import get_schema_dict


def get_retriever_index(config: RAGConfig, redis_client: Redis | None = None) -> SearchIndex:
    """Return SearchIndex for retrieval (does not create if missing)."""
    schema_dict = get_schema_dict(config)
    if redis_client is not None:
        index = SearchIndex.from_dict(
            schema_dict,
            redis_client=redis_client,
            validate_on_load=True,
        )
    else:
        index = SearchIndex.from_dict(
            schema_dict,
            redis_url=config.redis_url,
            validate_on_load=True,
        )
    return index


def retrieve(
    query: str,
    config: RAGConfig | None = None,
    *,
    top_k: int | None = None,
    filter_expression: str | None = None,
    redis_client: Redis | None = None,
) -> list[Document]:
    """
    Embed query, run vector search on RedisVL, return LangChain Documents.

    Args:
        query: User query string.
        config: RAG config; uses RAGConfig.from_env() if None.
        top_k: Number of chunks to return; uses config.top_k if None.
        filter_expression: Optional RedisVL filter (e.g. "@source:{path}").
        redis_client: Optional Redis client.

    Returns:
        List of LangChain Document with page_content and metadata (source, chunk_index, score).
    """
    config = config or RAGConfig.from_env()
    k = top_k if top_k is not None else config.top_k

    embeddings = OpenAIEmbeddings(model=config.embedding_model)
    query_vector = embeddings.embed_query(query)

    index = get_retriever_index(config, redis_client=redis_client)
    if not index.exists():
        return []

    vector_query = VectorQuery(
        vector=query_vector,
        vector_field_name="content_embedding",
        return_fields=["content", "source", "chunk_index", "vector_distance"],
        num_results=k,
        filter_expression=filter_expression,
    )
    raw = index.query(vector_query)
    results = raw if isinstance(raw, list) else getattr(raw, "results", [raw]) or []

    docs: list[Document] = []
    for item in results:
        content = item.get("content", "") if isinstance(item, dict) else getattr(item, "content", "")
        src = item.get("source", "") if isinstance(item, dict) else getattr(item, "source", "")
        idx = item.get("chunk_index", 0) if isinstance(item, dict) else getattr(item, "chunk_index", 0)
        dist = item.get("vector_distance") if isinstance(item, dict) else getattr(item, "vector_distance", None)
        metadata: dict[str, Any] = {
            "source": src,
            "chunk_index": idx,
            "score": (1 - float(dist)) if dist is not None else None,
        }
        docs.append(Document(page_content=content or "", metadata=metadata))
    return docs
