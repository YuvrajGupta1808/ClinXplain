"""LangGraph RAG pipeline: retrieve → generate."""

from __future__ import annotations

from typing import Annotated, TypedDict

from langchain_core.documents import Document
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages

from .config import RAGConfig
from .retrieval import retrieve


class RAGState(TypedDict):
    """State for the RAG graph."""

    messages: Annotated[list[BaseMessage], add_messages]
    context: list[Document]
    question: str


def _get_question(state: RAGState) -> str:
    """Extract the latest user question from messages."""
    for m in reversed(state["messages"]):
        if isinstance(m, HumanMessage) and m.content:
            return m.content if isinstance(m.content, str) else str(m.content)
    return ""


def retrieve_node(state: RAGState, config: RunnableConfig) -> dict:
    """Retrieve relevant documents and attach to state."""
    question = _get_question(state)
    if not question:
        return {"context": [], "question": question}

    rag_config = RAGConfig.from_env()
    docs = retrieve(question, config=rag_config, top_k=rag_config.top_k)
    return {"context": docs, "question": question}


def generate_node(state: RAGState, config: RunnableConfig) -> dict:
    """Build context from retrieved docs and generate answer with LLM."""
    context_docs = state.get("context") or []
    question = state.get("question") or _get_question(state)

    context_str = "\n\n---\n\n".join(
        d.page_content for d in context_docs
    ) or "No relevant context found."

    rag_config = RAGConfig.from_env()
    llm = ChatOpenAI(
        model=rag_config.llm_model,
        temperature=rag_config.llm_temperature,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You answer questions based only on the following context. If the context does not contain enough information, say so. Do not make up information.\n\nContext:\n{context}"),
        ("human", "{question}"),
    ])
    chain = prompt | llm
    response = chain.invoke({"context": context_str, "question": question})

    return {"messages": [response]}


def build_rag_graph() -> StateGraph:
    """Build the LangGraph RAG pipeline: retrieve → generate → END."""
    graph = StateGraph(RAGState)

    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate", generate_node)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", END)

    return graph


def compile_rag_graph():
    """Compile and return the runnable RAG graph."""
    return build_rag_graph().compile()
