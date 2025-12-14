# Vercel Python Function entrypoint for FastAPI.
# Vercel detects the `app` variable and serves it as an ASGI app.

from apps.api.main import app  # noqa: F401
