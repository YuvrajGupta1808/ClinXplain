#!/usr/bin/env python3
"""Run the RAG FastAPI server. Use from project root with PYTHONPATH=src."""

import os
import sys

# Ensure src is on path when run from project root
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

if __name__ == "__main__":
    from RAG.api import main
    main()
