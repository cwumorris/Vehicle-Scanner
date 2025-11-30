"""
Make `backend` an explicit Python package.

This file is intentionally minimal. It ensures `import backend.main` works when
the project root is on Python's import path. If you run the server from inside
the `backend/` directory, use `uvicorn main:app` instead of
`uvicorn backend.main:app`.
"""

__all__ = ["main", "database", "models"]
