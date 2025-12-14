# api/backend.py
# Vercel Python Function entrypoint that adapts request paths for the FastAPI app.
# This lets us call:  /api/backend/api/rag/run
# And have FastAPI receive: /api/rag/run

from __future__ import annotations

from typing import Callable, Awaitable, Dict, Any

from apps.api.main import app as fastapi_app  # your real FastAPI app


class StripPrefixASGI:
    """
    ASGI middleware to strip a leading URL prefix before handing off to the FastAPI app.

    Example:
      incoming scope["path"] = "/api/backend/api/rag/run"
      strip_prefix = "/api/backend"
      forwarded path to FastAPI = "/api/rag/run"
    """

    def __init__(self, inner_app: Callable, strip_prefix: str):
        self.inner_app = inner_app
        self.strip_prefix = strip_prefix.rstrip("/") if strip_prefix != "/" else strip_prefix

    async def __call__(self, scope: Dict[str, Any], receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            return await self.inner_app(scope, receive, send)

        path = scope.get("path", "") or ""
        new_scope = dict(scope)

        # Strip either "/api/backend" (what we proxy to) OR "/backend" (rewrite convenience)
        for prefix in (self.strip_prefix, "/backend"):
            if prefix and prefix != "/" and path.startswith(prefix):
                stripped = path[len(prefix) :]
                new_scope["path"] = stripped if stripped.startswith("/") else ("/" + stripped)
                # Preserve root_path for framework URL generation
                new_scope["root_path"] = (scope.get("root_path") or "") + prefix
                break

        return await self.inner_app(new_scope, receive, send)


# Vercel detects `app` as the ASGI entrypoint.
app = StripPrefixASGI(fastapi_app, strip_prefix="/api/backend")
