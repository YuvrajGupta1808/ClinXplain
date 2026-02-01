#!/usr/bin/env python3
"""ClinXplain chatbot: upload documents (RAG ingest) and chat via WebSocket with streaming."""

from __future__ import annotations

import asyncio
import json
from urllib.parse import urlparse

import streamlit as st

st.set_page_config(page_title="ClinXplain Chat", layout="wide", initial_sidebar_state="expanded")

# Session state: chat history and API base
if "messages" not in st.session_state:
    st.session_state.messages = []
if "api_base" not in st.session_state:
    st.session_state.api_base = "http://localhost:8000"


def ws_url(base_url: str) -> str:
    parsed = urlparse(base_url)
    scheme = "wss" if parsed.scheme == "https" else "ws"
    netloc = parsed.netloc or parsed.path
    path = parsed.path.rstrip("/") + "/ws/chat"
    return f"{scheme}://{netloc}{path}"


# ---------------------------------------------------------------------------
# Sidebar: API URL, document upload, clear chat
# ---------------------------------------------------------------------------
with st.sidebar:
    st.header("Settings")
    st.caption("Start the API first: `uv run api`")
    base = st.text_input(
        "API base URL",
        value=st.session_state.api_base,
        help="ClinXplain API (e.g. http://localhost:8000). Run: uv run api",
        key="api_base_input",
    ).rstrip("/")
    st.session_state.api_base = base

    st.divider()
    st.subheader("Upload documents")
    st.caption("Upload PDFs or text files to add them to RAG. Then ask questions in the chat.")
    uploaded = st.file_uploader(
        "Choose files",
        type=["pdf", "txt", "md"],
        accept_multiple_files=True,
        key="uploader",
    )
    if uploaded and st.button("Ingest into RAG", key="ingest_btn"):
        try:
            import httpx
            files = [
                ("files", (f.name, f.getvalue(), f.type or "application/octet-stream"))
                for f in uploaded
            ]
            r = httpx.post(f"{base}/ingest", files=files, timeout=120.0)
            if r.status_code == 200:
                data = r.json()
                st.success(f"Ingested {data.get('chunks_ingested', 0)} chunks from {data.get('files_received', 0)} file(s).")
            else:
                st.error(f"Error {r.status_code}: {r.text[:200]}")
        except Exception as e:
            st.error(str(e))

    st.divider()
    if st.button("Clear chat", key="clear_btn"):
        st.session_state.messages = []
        st.rerun()


# ---------------------------------------------------------------------------
# Main: title and chat
# ---------------------------------------------------------------------------
st.title("ClinXplain")
st.caption("Chat over your documents. Upload files in the sidebar, then ask questions below.")

# Render existing messages
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Chat input and send
prompt = st.chat_input("Ask a question about your documents...")
if prompt:
    # Append user message
    st.session_state.messages.append({"role": "user", "content": prompt})

    # Show user message immediately
    with st.chat_message("user"):
        st.markdown(prompt)

    # Assistant reply via WebSocket (streaming from API; we show full response when done)
    with st.chat_message("assistant"):
        stream_placeholder = st.empty()
        stream_placeholder.markdown("Thinking…")
        # Build conversation_history from prior user/assistant pairs
        conversation_history = []
        for i, m in enumerate(st.session_state.messages[:-1]):
            if m["role"] == "user" and i + 1 < len(st.session_state.messages):
                next_m = st.session_state.messages[i + 1]
                if next_m["role"] == "assistant":
                    conversation_history.append({"query": m["content"], "response": next_m["content"]})

        try:
            import websockets
        except ImportError:
            stream_placeholder.markdown("Install websockets: `uv add websockets`")
            st.session_state.messages.append({"role": "assistant", "content": ""})
            st.stop()

        async def run_ws():
            uri = ws_url(base)
            accumulated = []
            error_detail = None
            async with websockets.connect(uri, open_timeout=10, close_timeout=60) as ws:
                await ws.send(json.dumps({
                    "message": prompt,
                    "patient_id": None,
                    "conversation_history": conversation_history,
                }))
                async for raw in ws:
                    try:
                        data = json.loads(raw)
                    except json.JSONDecodeError:
                        continue
                    msg_type = data.get("type")
                    if msg_type == "token":
                        content = data.get("content", "")
                        accumulated.append(content)
                    elif msg_type == "done":
                        return data.get("response", "") or "".join(accumulated), None
                    elif msg_type == "error":
                        error_detail = data.get("detail", "Unknown error")
                        return "", error_detail
            return "".join(accumulated), error_detail

        full_response = ""
        try:
            full_response, err = asyncio.run(run_ws())
            if err:
                stream_placeholder.error(err)
                full_response = ""
            else:
                stream_placeholder.markdown(full_response)
        except Exception as e:
            stream_placeholder.error(str(e))
            full_response = ""

        st.session_state.messages.append({"role": "assistant", "content": full_response})

    st.rerun()
