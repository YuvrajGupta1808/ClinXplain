"""High-level RAG pipeline: ingest documents and query with LangGraph."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from langchain_core.messages import HumanMessage

from .config import RAGConfig
from .graph import compile_rag_graph
from .ingestion import ingest
from .retrieval import retrieve


class RAGPipeline:
    """
    End-to-end RAG pipeline using RedisVL, LangChain, and LangGraph.

    - Ingest: load documents (PDF, text, markdown), chunk, embed, index into RedisVL.
    - Retrieve: vector search over RedisVL, return LangChain Documents.
    - Generate: LangGraph flow (retrieve → generate) for Q&A.
    """

    def __init__(self, config: RAGConfig | None = None):
        self.config = config or RAGConfig.from_env()
        self._graph = None

    @property
    def graph(self):
        """Lazy-compiled LangGraph RAG graph."""
        if self._graph is None:
            self._graph = compile_rag_graph()
        return self._graph

    def ingest(
        self,
        path: str | Path,
        *,
        glob: str = "**/*.pdf",
        loader_type: str = "auto",
        redis_client: Any = None,
    ) -> list[str]:
        """
        Ingest documents from path into the vector index.

        Returns:
            List of Redis keys written.
        """
        return ingest(
            path,
            config=self.config,
            glob=glob,
            loader_type=loader_type,
            redis_client=redis_client,
        )

    def retrieve(
        self,
        query: str,
        *,
        top_k: int | None = None,
        filter_expression: str | None = None,
        redis_client: Any = None,
    ):
        """
        Retrieve relevant document chunks for a query.

        Returns:
            List of LangChain Document objects.
        """
        return retrieve(
            query,
            config=self.config,
            top_k=top_k,
            filter_expression=filter_expression,
            redis_client=redis_client,
        )

    def query(
        self,
        question: str,
        *,
        config: dict[str, Any] | None = None,
    ) -> str:
        """
        Run the full RAG pipeline: retrieve context and generate an answer.

        Returns:
            Generated answer string.
        """
        result = self.graph.invoke(
            {
                "messages": [HumanMessage(content=question)],
                "context": [],
                "question": "",
            },
            config=config or {},
        )
        messages = result.get("messages", [])
        if messages:
            last = messages[-1]
            return getattr(last, "content", str(last)) if hasattr(last, "content") else str(last)
        return ""
