"""Single-service entrypoint for hosting the frontend and API together."""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

if __package__:
    from .main import app as api_app
else:
    from main import app as api_app


def create_app(frontend_dir: str | Path | None = None) -> FastAPI:
    directory = Path(frontend_dir or os.environ.get(
        'FRONTEND_DIR', str(Path(__file__).resolve().parent.parent / 'frontend_dist')
    ))
    if not (directory / 'index.html').is_file():
        raise RuntimeError('Frontend build not found. Use the root Dockerfile to build the full app.')

    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @app.get('/healthz')
    async def health():
        return {'status': 'ok'}

    # Keep API routes ahead of the static mount. Existing browser requests to
    # /api/... keep working, and unknown API routes return JSON rather than HTML.
    app.mount('/api', api_app)
    # The frontend uses hash routing, so serving index.html at / is sufficient.
    app.mount('/', StaticFiles(directory=directory, html=True), name='frontend')
    return app
