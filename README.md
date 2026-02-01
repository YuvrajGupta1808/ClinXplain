# ClinXplain

RAG pipeline with document ingestion, chunking, embedding, and retrieval using **Redis** (RedisVL), **LangChain**, and **LangGraph**, plus a **FastAPI** server for ingest, retrieve, and query.

## Quick start

### 1. Environment

Copy `.env.example` to `.env` and set Redis and OpenAI:

```bash
cp .env.example .env
# Edit .env:
#   REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_REDIS_HOST:PORT
#   OPENAI_API_KEY=sk-your-openai-api-key
```

For **Redis Cloud**, use your database URL (TLS: `rediss://` if required).

### 2. Install

```bash
uv sync
```

### 3. Run the RAG API

```bash
PYTHONPATH=src uv run python scripts/run_rag_api.py
```

Or:

```bash
PYTHONPATH=src uv run uvicorn RAG.api:app --host 0.0.0.0 --port 8000
```

- API: **http://localhost:8000**
- Docs: **http://localhost:8000/docs**
- Health: **GET http://localhost:8000/health**

### 4. Use the API

- **Ingest** (path must exist on the server):
  ```bash
  curl -X POST http://localhost:8000/ingest \
    -H "Content-Type: application/json" \
    -d '{"path": "/path/to/documents", "glob": "**/*.pdf", "loader_type": "auto"}'
  ```

- **Retrieve** (chunks only):
  ```bash
  curl -X POST http://localhost:8000/retrieve \
    -H "Content-Type: application/json" \
    -d '{"query": "your search query", "top_k": 5}'
  ```

- **Query** (retrieve + generate answer):
  ```bash
  curl -X POST http://localhost:8000/query \
    -H "Content-Type: application/json" \
    -d '{"question": "What is the main topic?"}'
  ```

## Config

See `.env.example`. Main variables:

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis connection URL (Redis Cloud or local) |
| `OPENAI_API_KEY` | OpenAI API key (embeddings + LLM) |
| `RAG_INDEX_NAME` | RedisVL index name (default: `rag_docs`) |
| `RAG_TOP_K` | Chunks to retrieve (default: 5) |
| `RAG_API_HOST` / `RAG_API_PORT` | API server (default: 0.0.0.0:8000) |

## RAG pipeline (Python)

```python
from RAG import RAGPipeline, RAGConfig

# Ensure src is on PYTHONPATH
pipeline = RAGPipeline()
pipeline.ingest("/path/to/documents")
docs = pipeline.retrieve("search query", top_k=5)
answer = pipeline.query("Your question?")
```

## Project layout

- `src/RAG/` – RAG pipeline (config, ingestion, retrieval, graph, pipeline, API)
- `scripts/run_rag_api.py` – Run the FastAPI server
- `.env.example` – Example environment variables

## Redis MCP

If you use the Redis MCP in Cursor, the RAG pipeline uses the same Redis (via `REDIS_URL`). Configure Redis MCP with your Redis Cloud URL so the AI can run Redis commands and the RAG app uses the same database.
