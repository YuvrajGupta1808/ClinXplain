"""RAG pipeline with document ingestion, chunking, embedding, and retrieval using RedisVL, LangChain, and LangGraph."""

from .config import RAGConfig
from .pipeline import RAGPipeline

__all__ = ["RAGConfig", "RAGPipeline"]

# Optional Weave evaluation (import from RAG.weave_eval for run_evaluation, RAGModel, etc.)
