"""FastAPI app for the RAG pipeline: ingest, retrieve, query."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .config import RAGConfig
from .pipeline import RAGPipeline

# Load env before building config
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = FastAPI(
    title="ClinXplain RAG API",
    description="RAG pipeline over Redis: document ingestion, retrieval, and query (retrieve + generate).",
    version="0.1.0",
)

# Lazy pipeline (uses RAGConfig.from_env())
_pipeline: RAGPipeline | None = None


def get_pipeline() -> RAGPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = RAGPipeline(RAGConfig.from_env())
    return _pipeline


# --- Request/Response models ---


class IngestRequest(BaseModel):
    path: str = Field(..., description="Directory or file path to ingest")
    glob: str = Field(default="**/*.pdf", description="Glob for directory loading")
    loader_type: str = Field(default="auto", description="auto | pdf | text | markdown")


class IngestResponse(BaseModel):
    keys_written: int
    message: str


class RetrieveRequest(BaseModel):
    query: str = Field(..., description="Search query")
    top_k: int | None = Field(default=None, description="Number of chunks to return")


class RetrieveChunk(BaseModel):
    content: str
    source: str
    chunk_index: int
    score: float | None


class RetrieveResponse(BaseModel):
    chunks: list[RetrieveChunk]


class QueryRequest(BaseModel):
    question: str = Field(..., description="Question to answer with RAG")


class QueryResponse(BaseModel):
    answer: str


# --- Routes ---


@app.get("/health")
def health() -> dict[str, str]:
    """Health check; verifies Redis and config are reachable."""
    try:
        config = RAGConfig.from_env()
        from redisvl.index import SearchIndex
        from .ingestion import get_schema_dict
        schema_dict = get_schema_dict(config)
        index = SearchIndex.from_dict(schema_dict, redis_url=config.redis_url)
        exists = index.exists()
        return {
            "status": "ok",
            "redis_connected": "yes",
            "index_exists": "yes" if exists else "no",
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail={"status": "error", "message": str(e)})


@app.post("/ingest", response_model=IngestResponse)
def ingest_docs(body: IngestRequest) -> IngestResponse:
    """Ingest documents from a path: load → chunk → embed → index into Redis."""
    path = Path(body.path)
    if not path.exists():
        raise HTTPException(status_code=400, detail=f"Path does not exist: {body.path}")
    try:
        pipeline = get_pipeline()
        keys = pipeline.ingest(
            path,
            glob=body.glob,
            loader_type=body.loader_type,
        )
        return IngestResponse(keys_written=len(keys), message=f"Ingested {len(keys)} chunks.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/retrieve", response_model=RetrieveResponse)
def retrieve_docs(body: RetrieveRequest) -> RetrieveResponse:
    """Retrieve relevant document chunks for a query (no LLM)."""
    try:
        pipeline = get_pipeline()
        docs = pipeline.retrieve(body.query, top_k=body.top_k)
        chunks = [
            RetrieveChunk(
                content=d.page_content,
                source=d.metadata.get("source", ""),
                chunk_index=d.metadata.get("chunk_index", 0),
                score=d.metadata.get("score"),
            )
            for d in docs
        ]
        return RetrieveResponse(chunks=chunks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query", response_model=QueryResponse)
def query_rag(body: QueryRequest) -> QueryResponse:
    """Run full RAG: retrieve context and generate an answer."""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY not set; required for generation.",
        )
    try:
        pipeline = get_pipeline()
        answer = pipeline.query(body.question)
        return QueryResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def main() -> None:
    """Run the API with uvicorn. Use PYTHONPATH=src when running from project root."""
    import uvicorn
    host = os.getenv("RAG_API_HOST", "0.0.0.0")
    port = int(os.getenv("RAG_API_PORT", "8000"))
    # Module path: RAG.api when PYTHONPATH=src
    uvicorn.run("RAG.api:app", host=host, port=port, reload=True)


if __name__ == "__main__":
    main()
