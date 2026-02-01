"""Self-evolving supervisor multi-agent system for medical Q&A.

Based on self_evolving_medical_qa.ipynb: supervisor that manages context
selection strategy and delegates to the agentic RAG sub-agent. Flow:
  START → synthesize_context → delegate_to_rag → check_continuation
       → [evolve] evolve_strategy → (loop to synthesize_context)
       → [finalize] finalize_response → END
"""

from __future__ import annotations

import asyncio
import json
import operator
import uuid
from datetime import datetime
from typing import Annotated, Any, Literal, TypedDict

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from .rag import RAGConfig, RAGPipeline
from .agentic import create_rag_agent


# -----------------------------------------------------------------------------
# Data models
# -----------------------------------------------------------------------------


class ContextStrategy(BaseModel):
    """Evolving context selection strategy (RAG vs memory weights)."""

    version: int
    rag_weight: float = Field(default=0.70, ge=0.0, le=1.0)
    memory_weight: float = Field(default=0.30, ge=0.0, le=1.0)
    retrieval_depth: int = Field(default=5, ge=1, le=20)
    similarity_threshold: float = Field(default=0.75, ge=0.0, le=1.0)
    max_iterations: int = Field(default=3, ge=1, le=5)
    iteration_count: int = 0
    last_response_quality: float = 0.0

    def validate_weights(self) -> None:
        total = self.rag_weight + self.memory_weight
        if not 0.99 <= total <= 1.01:
            self.rag_weight /= total
            self.memory_weight /= total


class RetrievedDocument(BaseModel):
    """A document retrieved from Redis VL."""

    content: str
    source: str
    score: float
    metadata: dict[str, Any] = Field(default_factory=dict)


class ConversationTurn(BaseModel):
    """A single turn in the conversation."""

    turn_number: int
    query: str
    response: str
    timestamp: datetime = Field(default_factory=datetime.now)
    context_used: str = ""


class AgentState(TypedDict, total=False):
    """Main graph state for the self-evolving supervisor."""

    query: str
    patient_id: str | None
    rag_results: Annotated[list[RetrievedDocument], operator.add]
    conversation_history: Annotated[list[ConversationTurn], operator.add]
    context_strategy: ContextStrategy
    combined_context: str
    rag_response: str
    reformulated_query: str
    sources_used: list[str]
    current_iteration: int
    should_continue: bool
    final_response: str
    strategy_history: list[ContextStrategy]


# -----------------------------------------------------------------------------
# Redis VL adapter (RAG pipeline → search interface for supervisor)
# -----------------------------------------------------------------------------


class RedisVLAdapter:
    """Adapter: RAG pipeline (RedisVL) exposing async search(patient_id, query, k, threshold)."""

    def __init__(self, pipeline: RAGPipeline, redis_client: Any = None) -> None:
        self.pipeline = pipeline
        self.redis_client = redis_client

    async def search(
        self,
        patient_id: str,
        query: str,
        k: int = 5,
        threshold: float = 0.75,
    ) -> list[RetrievedDocument]:
        """Vector search via RAG pipeline; map to RetrievedDocument and filter by threshold."""
        effective_query = f"{query}" if not patient_id else f"Patient {patient_id}: {query}"
        docs = await asyncio.to_thread(
            self.pipeline.retrieve,
            effective_query,
            top_k=k,
            redis_client=self.redis_client,
        )
        results: list[RetrievedDocument] = []
        for d in docs:
            score = float(d.metadata.get("score") or 0.0)
            if score >= threshold:
                results.append(
                    RetrievedDocument(
                        content=d.page_content or "",
                        source=d.metadata.get("source", ""),
                        score=score,
                        metadata=dict(d.metadata),
                    )
                )
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:k]


# -----------------------------------------------------------------------------
# Short-term memory (optional Redis VL–backed)
# -----------------------------------------------------------------------------

try:
    from redisvl.index import SearchIndex
    from redisvl.query import VectorQuery
    from redisvl.schema.schema import IndexSchema

    _REDISVL_AVAILABLE = True
except ImportError:
    _REDISVL_AVAILABLE = False
    SearchIndex = None  # type: ignore[misc, assignment]
    VectorQuery = None  # type: ignore[misc, assignment]
    IndexSchema = None  # type: ignore[misc, assignment]


class ShortTermMemory:
    """Redis VL–backed short-term memory: add turns, get recent, or search by similarity."""

    def __init__(self, index: Any, embeddings: OpenAIEmbeddings) -> None:
        if not _REDISVL_AVAILABLE:
            raise ImportError("ShortTermMemory requires redisvl (IndexSchema, SearchIndex, VectorQuery).")
        self.index = index
        self.embeddings = embeddings

    def add(
        self,
        user_id: str,
        query: str,
        response: str,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Store a conversation turn. Returns memory_id."""
        memory_id = str(uuid.uuid4())
        content = f"Q: {query}\nA: {response}"
        created_at = datetime.utcnow().isoformat() + "Z"
        meta_str = json.dumps(metadata or {})
        vector = self.embeddings.embed_query(content)
        record = {
            "content": content,
            "memory_type": "short_term",
            "metadata": meta_str,
            "created_at": created_at,
            "user_id": user_id,
            "memory_id": memory_id,
            "embedding": vector,
        }
        self.index.upsert([record])
        return memory_id

    def get_recent(self, user_id: str, limit: int = 10) -> list[dict[str, Any]]:
        """Fetch recent memories for user (by vector search then sort by created_at)."""
        if not self.index.exists():
            return []
        query_vec = self.embeddings.embed_query("recent conversation memory")
        q = VectorQuery(
            vector=query_vec,
            vector_field_name="embedding",
            return_fields=["content", "created_at", "metadata"],
            num_results=limit * 2,
            filter_expression=f"@user_id:{{{user_id}}}",
        )
        raw = self.index.query(q)
        results = raw if isinstance(raw, list) else getattr(raw, "results", [raw]) or []
        for r in results:
            if isinstance(r, dict) and "created_at" not in r:
                r["created_at"] = ""
        results.sort(key=lambda x: (x.get("created_at") or ""), reverse=True)
        return results[:limit]

    def search(self, user_id: str, query: str, k: int = 5) -> list[dict[str, Any]]:
        """Semantic search over user's short-term memories."""
        if not self.index.exists():
            return []
        query_vec = self.embeddings.embed_query(query)
        q = VectorQuery(
            vector=query_vec,
            vector_field_name="embedding",
            return_fields=["content", "created_at", "metadata"],
            num_results=k,
            filter_expression=f"@user_id:{{{user_id}}}",
        )
        raw = self.index.query(q)
        return raw if isinstance(raw, list) else getattr(raw, "results", [raw]) or []


def create_short_term_memory(
    redis_client: Any,
    rag_config: RAGConfig | None = None,
) -> ShortTermMemory | None:
    """Create ShortTermMemory index and instance if redisvl is available. Returns None on failure."""
    if not _REDISVL_AVAILABLE:
        return None
    config = rag_config or RAGConfig.from_env()
    dims = getattr(config, "embedding_dimensions", 1536)
    memory_schema = IndexSchema.from_dict({
        "index": {
            "name": "agent_short_term_memory",
            "prefix": "memory:",
            "key_separator": ":",
            "storage_type": "json",
        },
        "fields": [
            {"name": "content", "type": "text"},
            {"name": "memory_type", "type": "tag"},
            {"name": "metadata", "type": "text"},
            {"name": "created_at", "type": "text"},
            {"name": "user_id", "type": "tag"},
            {"name": "memory_id", "type": "tag"},
            {
                "name": "embedding",
                "type": "vector",
                "attrs": {
                    "algorithm": "flat",
                    "dims": dims,
                    "distance_metric": "cosine",
                    "datatype": "float32",
                },
            },
        ],
    })
    index = SearchIndex(schema=memory_schema, redis_client=redis_client, overwrite=False)
    try:
        if not index.exists():
            index.create()
    except Exception:
        return None
    return ShortTermMemory(index, OpenAIEmbeddings(model=config.embedding_model))


# -----------------------------------------------------------------------------
# Context manager (synthesize context + evolve strategy)
# -----------------------------------------------------------------------------


class ContextManager:
    """Manages context synthesis and strategy evolution."""

    def __init__(self, db: RedisVLAdapter, short_term_memory: ShortTermMemory | None = None) -> None:
        self.db = db
        self.short_term_memory = short_term_memory
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

    async def synthesize_context(
        self,
        query: str,
        patient_id: str | None,
        conversation_history: list[ConversationTurn],
        strategy: ContextStrategy,
    ) -> str:
        """Synthesize context from RAG (patient history) and conversation memory per strategy weights."""
        rag_context = ""
        if patient_id:
            rag_results = await self.db.search(
                patient_id=patient_id,
                query=query,
                k=strategy.retrieval_depth,
                threshold=strategy.similarity_threshold,
            )
            if rag_results:
                rag_docs = [f"[Score: {r.score:.2f}] {r.content}" for r in rag_results]
                rag_context = "\n\n".join(rag_docs)

        user_id = patient_id or "default"
        memory_context = self._get_relevant_memory(conversation_history, query, user_id=user_id)

        synthesis_prompt = f"""
You are synthesizing medical context for a patient query.

WEIGHTS: Patient History (RAG): {strategy.rag_weight:.0%}, Conversation Memory: {strategy.memory_weight:.0%}

PATIENT HISTORY:
{rag_context if rag_context else "[No relevant patient history found]"}

CONVERSATION HISTORY:
{memory_context if memory_context else "[No previous conversation]"}

CURRENT QUERY: {query}

Synthesize the above into a coherent, clinically relevant context summary. Prioritize by weights.
"""
        response = await self.llm.ainvoke(synthesis_prompt)
        return response.content if hasattr(response, "content") else str(response)

    def _get_relevant_memory(
        self,
        history: list[ConversationTurn],
        current_query: str,
        limit: int = 3,
        user_id: str | None = None,
    ) -> str:
        memory_parts = []
        if history:
            for turn in history[-limit:]:
                memory_parts.append(f"Q: {turn.query}\nA: {turn.response}")
        if self.short_term_memory and user_id:
            try:
                redis_memories = self.short_term_memory.get_recent(user_id, limit=limit)
                for m in redis_memories:
                    content = m.get("content", "") if isinstance(m, dict) else getattr(m, "content", "")
                    if content and content not in "\n\n---\n\n".join(memory_parts):
                        memory_parts.append(content)
            except Exception:
                pass
        return "\n\n---\n\n".join(memory_parts) if memory_parts else ""

    def evolve_strategy(
        self,
        current_strategy: ContextStrategy,
        iteration: int,
        response_quality: float,
    ) -> ContextStrategy:
        new_strategy = ContextStrategy(
            version=current_strategy.version + 1,
            rag_weight=current_strategy.rag_weight,
            memory_weight=current_strategy.memory_weight,
            retrieval_depth=current_strategy.retrieval_depth,
            similarity_threshold=current_strategy.similarity_threshold,
            max_iterations=current_strategy.max_iterations,
            iteration_count=iteration,
            last_response_quality=response_quality,
        )
        if iteration == 2 and response_quality < 0.7:
            new_strategy.rag_weight = min(0.85, current_strategy.rag_weight + 0.15)
            new_strategy.memory_weight = 1.0 - new_strategy.rag_weight
            new_strategy.retrieval_depth = min(10, current_strategy.retrieval_depth + 2)
        elif iteration >= 3:
            new_strategy.rag_weight = 0.90
            new_strategy.memory_weight = 0.10
            new_strategy.retrieval_depth = min(15, current_strategy.retrieval_depth + 3)
            new_strategy.similarity_threshold = max(0.6, current_strategy.similarity_threshold - 0.1)
        new_strategy.validate_weights()
        return new_strategy

    def should_continue(
        self,
        iteration: int,
        max_iterations: int,
        response_quality: float = 0.0,
    ) -> bool:
        if iteration >= max_iterations:
            return False
        if response_quality >= 0.85:
            return False
        return True


# -----------------------------------------------------------------------------
# Supervisor graph and factory
# -----------------------------------------------------------------------------


def _build_supervisor_nodes(
    context_manager: ContextManager,
    rag_agent: Any,
    short_term_memory: ShortTermMemory | None,
):
    """Build node functions that close over context_manager, rag_agent, short_term_memory."""

    async def synthesize_context_node(state: AgentState) -> dict[str, Any]:
        combined_context = await context_manager.synthesize_context(
            query=state["query"],
            patient_id=state.get("patient_id"),
            conversation_history=state.get("conversation_history") or [],
            strategy=state["context_strategy"],
        )
        return {"combined_context": combined_context}

    async def delegate_to_rag_node(state: AgentState) -> dict[str, Any]:
        rag_input = f"""
PATIENT ID: {state.get('patient_id', 'Not specified')}

SYNTHESIZED CONTEXT:
{state.get('combined_context', '')}

CURRENT QUERY: {state['query']}

Please retrieve patient information and answer the query based on the patient's history.
"""
        result = await rag_agent.ainvoke({"messages": [HumanMessage(content=rag_input)]})
        rag_response = result["messages"][-1].content if result.get("messages") else ""
        quality_score = 0.7 + (0.1 * state.get("current_iteration", 1))
        strategy = state["context_strategy"]
        updated_strategy = strategy.model_copy(update={"last_response_quality": quality_score})
        return {
            "rag_response": rag_response,
            "sources_used": ["patient_history_db"],
            "context_strategy": updated_strategy,
        }

    def check_continuation_node(state: AgentState) -> Literal["evolve", "finalize"]:
        strategy = state["context_strategy"]
        current_iter = state.get("current_iteration", 1)
        quality = strategy.last_response_quality
        if context_manager.should_continue(
            iteration=current_iter,
            max_iterations=strategy.max_iterations,
            response_quality=quality,
        ):
            return "evolve"
        return "finalize"

    def evolve_strategy_node(state: AgentState) -> dict[str, Any]:
        new_strategy = context_manager.evolve_strategy(
            current_strategy=state["context_strategy"],
            iteration=state.get("current_iteration", 1),
            response_quality=state["context_strategy"].last_response_quality,
        )
        strategy_history = list(state.get("strategy_history") or [])
        strategy_history.append(state["context_strategy"])
        return {
            "context_strategy": new_strategy,
            "current_iteration": state.get("current_iteration", 1) + 1,
            "strategy_history": strategy_history,
        }

    def finalize_response_node(state: AgentState) -> dict[str, Any]:
        new_turn = ConversationTurn(
            turn_number=len(state.get("conversation_history") or []) + 1,
            query=state["query"],
            response=state.get("rag_response", ""),
            context_used=(state.get("combined_context") or "")[:500] + "...",
        )
        if short_term_memory:
            try:
                user_id = state.get("patient_id") or "default"
                short_term_memory.add(
                    user_id=user_id,
                    query=state["query"],
                    response=state.get("rag_response", ""),
                    metadata={"patient_id": state.get("patient_id"), "iteration": state.get("current_iteration")},
                )
            except Exception:
                pass
        final_output = f"""
## MEDICAL Q&A RESPONSE

**Query:** {state['query']}

**Patient ID:** {state.get('patient_id', 'Not specified')}

**Response:**
{state.get('rag_response', '')}

---

**Evolution Statistics:**
- Iterations: {state.get('current_iteration', 1)}
- Final Strategy: v{state['context_strategy'].version}
- Final Weights: RAG={state['context_strategy'].rag_weight:.0%}, Memory={state['context_strategy'].memory_weight:.0%}
- Estimated Quality: {state['context_strategy'].last_response_quality:.2f}
"""
        return {
            "final_response": final_output,
            "conversation_history": (state.get("conversation_history") or []) + [new_turn],
            "should_continue": False,
        }

    return (
        synthesize_context_node,
        delegate_to_rag_node,
        check_continuation_node,
        evolve_strategy_node,
        finalize_response_node,
    )


def create_supervisor(
    rag_pipeline: RAGPipeline,
    rag_agent: Any = None,
    redis_client: Any = None,
    short_term_memory: ShortTermMemory | None = None,
    rag_config: RAGConfig | None = None,
):
    """Create the self-evolving supervisor graph (compiled).

    Args:
        rag_pipeline: RAG pipeline (RedisVL) for retrieval.
        rag_agent: Message-based RAG agent (e.g. from create_rag_agent()). If None, uses create_rag_agent(rag_config).
        redis_client: Optional shared Redis client for pipeline and memory.
        short_term_memory: Optional Redis VL–backed short-term memory. If None, only in-memory history is used.
        rag_config: Used for create_rag_agent if rag_agent is None. Defaults to RAGConfig.from_env().

    Returns:
        Compiled LangGraph (invoke/ainvoke with AgentState).
    """
    config = rag_config or RAGConfig.from_env()
    agent = rag_agent or create_rag_agent(config)
    redis_vl = RedisVLAdapter(rag_pipeline, redis_client=redis_client)
    context_manager = ContextManager(redis_vl, short_term_memory=short_term_memory)

    (
        synthesize_context_node,
        delegate_to_rag_node,
        check_continuation_node,
        evolve_strategy_node,
        finalize_response_node,
    ) = _build_supervisor_nodes(context_manager, agent, short_term_memory)

    workflow = StateGraph(AgentState)
    workflow.add_node("synthesize_context", synthesize_context_node)
    workflow.add_node("delegate_to_rag", delegate_to_rag_node)
    workflow.add_node("evolve_strategy", evolve_strategy_node)
    workflow.add_node("finalize_response", finalize_response_node)

    workflow.add_edge(START, "synthesize_context")
    workflow.add_edge("synthesize_context", "delegate_to_rag")
    workflow.add_conditional_edges(
        "delegate_to_rag",
        check_continuation_node,
        {"evolve": "evolve_strategy", "finalize": "finalize_response"},
    )
    workflow.add_edge("evolve_strategy", "synthesize_context")
    workflow.add_edge("finalize_response", END)

    return workflow.compile()


async def query_medical_system(
    query: str,
    patient_id: str | None = None,
    conversation_history: list[ConversationTurn] | None = None,
    supervisor_graph: Any = None,
    rag_pipeline: RAGPipeline | None = None,
    rag_config: RAGConfig | None = None,
) -> dict[str, Any]:
    """Run a medical query through the self-evolving supervisor.

    Args:
        query: User question.
        patient_id: Optional patient id for scoped retrieval.
        conversation_history: Optional previous turns (for multi-turn).
        supervisor_graph: Pre-built compiled graph. If None, builds one from rag_pipeline and rag_config.
        rag_pipeline: Used to build supervisor if supervisor_graph is None. Defaults to RAGPipeline(rag_config).
        rag_config: Used to build pipeline/agent if not provided.

    Returns:
        Final AgentState (includes final_response, conversation_history, etc.).
    """
    if supervisor_graph is None:
        config = rag_config or RAGConfig.from_env()
        pipeline = rag_pipeline or RAGPipeline(config)
        supervisor_graph = create_supervisor(pipeline, rag_config=config, short_term_memory=None)

    initial_strategy = ContextStrategy(
        version=1,
        rag_weight=0.70,
        memory_weight=0.30,
        retrieval_depth=5,
        max_iterations=3,
    )
    initial_state: AgentState = {
        "query": query,
        "patient_id": patient_id,
        "rag_results": [],
        "conversation_history": conversation_history or [],
        "context_strategy": initial_strategy,
        "combined_context": "",
        "rag_response": "",
        "sources_used": [],
        "current_iteration": 1,
        "should_continue": True,
        "final_response": "",
        "strategy_history": [],
    }
    result = await supervisor_graph.ainvoke(initial_state)
    return result
