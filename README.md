# ClinXplain

RAG pipeline (document ingestion, chunking, embedding, retrieval) using **Redis** (RedisVL), **LangChain**, and **LangGraph**. This is a **component of the main app**: a **supervisor agent** accesses the RAG pipeline directly (no HTTP API).

## Quick start

### 1. Environment

Copy `.env.example` to `.env` and set Redis and OpenAI:

```bash
cp .env.example .env
# Edit .env: REDIS_URL, OPENAI_API_KEY (and REDIS_HOST/PORT/USERNAME/PASSWORD if not using REDIS_URL)
```

### 2. Install

```bash
uv sync
```

### 3. Use from the main app (supervisor agent)

```python
from RAG import RAGPipeline, RAGConfig

# Ensure src is on PYTHONPATH
pipeline = RAGPipeline()
pipeline.ingest("/path/to/documents")   # or docs/ / notebook/
docs = pipeline.retrieve("search query", top_k=5)
answer = pipeline.query("Your question?")
```

The **supervisor agent** can call `pipeline.ingest()`, `pipeline.retrieve()`, and `pipeline.query()` directly.

## Config

See `.env.example`. Main variables:

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis connection URL (or use REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD) |
| `OPENAI_API_KEY` | OpenAI API key (embeddings + LLM) |
| `RAG_INDEX_NAME` | RedisVL index name (default: `rag_docs`) |
| `RAG_TOP_K` | Chunks to retrieve (default: 5) |
| `RAG_CACHE_TTL` | Redis LLM cache TTL in seconds (default: 3600); 0 = disable |

## RAG evaluation and tracing (W&B Weave)

RAG evaluation and tracing follow the [W&B Weave RAG tutorial](https://docs.wandb.ai/weave/tutorial-rag):

- **Tracing**: Retrieval is wrapped with `weave.op()` so retrieval steps are tracked in Weave.
- **RAGModel**: A Weave `Model` with `predict(question)` returning `{answer, context}` for evaluation.
- **LLM judge**: Context precision scorer (RAGAS-style) — was the retrieved context useful for the answer?
- **Evaluation**: Run over a dataset of questions; results and traces appear in your W&B Weave project.

**Prerequisites**: `weave` and `wandb` (in `pyproject.toml`). Set `WANDB_API_KEY` in `.env`; optionally `WEAVE_PROJECT` (e.g. `your-team/rag-eval`) and `RAG_EVAL_JUDGE_MODEL` (default: `gpt-4o-mini`).

**CLI** (from project root with `PYTHONPATH=src`):

```bash
uv run python -m RAG.run_rag eval
uv run python -m RAG.run_rag eval --project your-team/rag-eval --parallelism 3
```

**In code**:

```python
from RAG.weave_eval import init_weave, RAGModel, run_evaluation, DEFAULT_EVAL_QUESTIONS

# One-off evaluation with default dataset
run_evaluation(project="your-team/rag-eval", parallelism=3)

# Or: init Weave, create model, run a single predict (traced)
init_weave("your-team/rag-eval")
model = RAGModel()
out = model.predict("Your question?")  # {"answer": "...", "context": "..."}
```

Customize the evaluation dataset by passing `dataset=[{"question": "..."}, ...]` to `run_evaluation()`, or edit `DEFAULT_EVAL_QUESTIONS` in `src/RAG/weave_eval.py`.

**RAGAS as LLM judge (optional):** Install RAGAS and use its metrics (faithfulness, answer relevancy) as Weave scorers:

```bash
uv add --optional ragas ragas
```

Then in code use RAGAS scorers with Weave (same pattern as the [Weave RAG tutorial](https://docs.wandb.ai/weave/tutorial-rag) and [RAGAS](https://docs.ragas.io/)):

```python
from RAG.weave_eval import (
    init_weave,
    RAGModel,
    run_evaluation,
    context_precision_score,      # Weave/LLM judge (context useful?)
    ragas_faithfulness_score,     # RAGAS: answer consistent with context
    ragas_answer_relevancy_score, # RAGAS: answer relevant to question
)

init_weave("your-team/rag-eval")
# Option 1: use_ragas=True adds RAGAS scorers to default context_precision
run_evaluation(use_ragas=True)

# Option 2: pass custom scorers (e.g. RAGAS only or mix)
run_evaluation(scorers=[ragas_faithfulness_score, ragas_answer_relevancy_score])
```

## RAG pipeline check notebook

Open `notebook/rag_pipeline_check.ipynb` to verify config, Redis health, **Redis LLM cache**, ingest, retrieve, and query.

## Redis LLM cache (fast RAG)

The pipeline uses a **Redis LLM cache** so identical or repeated prompts return cached responses. Set `RAG_CACHE_TTL=3600` in `.env`; use `0` to disable. Enable in code with `set_llm_cache(RedisCache(...))` (see notebook).

## Document path

- **`docs/`** – Put PDF, `.txt`, or `.md` here for ingest (created if missing).
- **`notebook/`** – Fallback if `docs/` is empty (e.g. `notebook/66_10.pdf`).
- Ingest: path → chunks + embeddings → **Redis**. Retrieve / Query read **from Redis**.

## Project layout

- `src/RAG/` – RAG pipeline (config, ingestion, retrieval, graph, pipeline)
- `docs/` – Document folder for RAG ingest
- `notebook/rag_pipeline_check.ipynb` – Check RAG + Redis cache
- `.env.example` – Example environment variables

## Redis MCP

If you use the Redis MCP in Cursor, the RAG pipeline uses the same Redis (via `REDIS_URL`).
