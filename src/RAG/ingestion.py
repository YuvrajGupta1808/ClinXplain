"""Document ingestion: loaders, chunking, embedding, and indexing into RedisVL."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import numpy as np
from langchain_community.document_loaders import (
    DirectoryLoader,
    PyPDFLoader,
    TextLoader,
)
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from redis import Redis
from redisvl.index import SearchIndex

from .config import RAGConfig


def get_schema_dict(config: RAGConfig) -> dict[str, Any]:
    """Build RedisVL index schema dict from config (dims must match embedding model)."""
    return {
        "index": {
            "name": config.index_name,
            "prefix": config.index_prefix,
        },
        "fields": [
            {"name": "content", "type": "text"},
            {"name": "source", "type": "tag"},
            {"name": "chunk_index", "type": "numeric"},
            {"name": "metadata", "type": "tag"},
            {
                "name": "content_embedding",
                "type": "vector",
                "attrs": {
                    "algorithm": "hnsw",
                    "datatype": "float32",
                    "dims": config.embedding_dimensions,
                    "distance_metric": "cosine",
                },
            },
        ],
    }


def load_documents(
    path: str | Path,
    glob: str = "**/*.pdf",
    loader_type: str = "auto",
) -> list[Document]:
    """
    Load documents from a directory or file.

    Args:
        path: Directory path or file path.
        glob: Glob pattern for DirectoryLoader (e.g. "**/*.pdf", "**/*.txt").
        loader_type: "auto", "pdf", "text", or "markdown". For "auto", uses DirectoryLoader with multiple suffixes.

    Returns:
        List of LangChain Document objects.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Path does not exist: {path}")

    if path.is_file():
        single_path = str(path)
        if single_path.lower().endswith(".pdf"):
            loader = PyPDFLoader(single_path)
        elif single_path.lower().endswith(".md"):
            loader = TextLoader(single_path)
        else:
            loader = TextLoader(single_path)
        return loader.load()

    loaders_map = {
        "pdf": (glob, PyPDFLoader),
        "text": (glob, TextLoader),
        "markdown": (glob, TextLoader),
    }
    if loader_type in loaders_map:
        pattern, loader_cls = loaders_map[loader_type]
        loader = DirectoryLoader(str(path), glob=pattern, loader_cls=loader_cls)
        return loader.load()

    # Auto: load PDFs and text/md
    all_docs: list[Document] = []
    for pattern, loader_cls in [("**/*.pdf", PyPDFLoader), ("**/*.txt", TextLoader), ("**/*.md", TextLoader)]:
        try:
            loader = DirectoryLoader(str(path), glob=pattern, loader_cls=loader_cls)
            all_docs.extend(loader.load())
        except Exception:
            continue
    return all_docs


def chunk_documents(
    documents: list[Document],
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[Document]:
    """Split documents into overlapping chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_documents(documents)


def embed_and_format_for_redis(
    chunks: list[Document],
    embeddings: OpenAIEmbeddings,
) -> list[dict[str, Any]]:
    """
    Embed chunk texts and format as RedisVL records (content_embedding as bytes).
    """
    texts = [d.page_content for d in chunks]
    vectors = embeddings.embed_documents(texts)

    records: list[dict[str, Any]] = []
    for i, (doc, vec) in enumerate(zip(chunks, vectors)):
        source = doc.metadata.get("source", "unknown")
        metadata_tag = str(doc.metadata.get("metadata", ""))[:500]  # tag field limit
        records.append({
            "content": doc.page_content,
            "source": source,
            "chunk_index": i,
            "metadata": metadata_tag or "none",
            "content_embedding": np.array(vec, dtype=np.float32).tobytes(),
        })
    return records


def get_or_create_index(config: RAGConfig, redis_client: Redis | None = None) -> SearchIndex:
    """Create or return RedisVL SearchIndex from config."""
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
    if not index.exists():
        index.create(overwrite=True)
    return index


def ingest(
    path: str | Path,
    config: RAGConfig | None = None,
    *,
    glob: str = "**/*.pdf",
    loader_type: str = "auto",
    redis_client: Redis | None = None,
) -> list[str]:
    """
    Ingest documents from path: load → chunk → embed → index into RedisVL.

    Args:
        path: Directory or file path to load from.
        config: RAG config; uses RAGConfig.from_env() if None.
        glob: Glob for directory loading.
        loader_type: "auto", "pdf", "text", or "markdown".
        redis_client: Optional Redis client; otherwise uses config.redis_url.

    Returns:
        List of Redis keys written.
    """
    config = config or RAGConfig.from_env()
    documents = load_documents(path, glob=glob, loader_type=loader_type)
    if not documents:
        return []

    chunks = chunk_documents(
        documents,
        chunk_size=config.chunk_size,
        chunk_overlap=config.chunk_overlap,
    )
    embeddings = OpenAIEmbeddings(model=config.embedding_model)
    records = embed_and_format_for_redis(chunks, embeddings)

    index = get_or_create_index(config, redis_client=redis_client)
    keys = index.load(records)
    return keys
