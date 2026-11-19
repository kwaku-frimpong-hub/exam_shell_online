# Single-container image for Render (Compose continues using api/Dockerfile
# and frontend/mencho_shell/Dockerfile).
FROM node:22-bookworm-slim AS frontend

WORKDIR /frontend
COPY frontend/mencho_shell/package.json frontend/mencho_shell/package-lock.json ./
RUN npm ci
COPY frontend/mencho_shell/ ./
RUN npm run lint && npm test && npm run build

FROM python:3.12-slim-bookworm AS dependencies

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
ENV UV_PYTHON_DOWNLOADS=never \
    UV_LINK_MODE=copy
WORKDIR /app/api
COPY README.md /app/README.md
COPY api/pyproject.toml api/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project --no-cache --python /usr/local/bin/python

FROM python:3.12-slim-bookworm AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       bash gcc libc6-dev binutils diffutils coreutils ncurses-bin \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --create-home app

ENV PATH="/app/api/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIR=/app/frontend_dist \
    PORT=10000 \
    ENABLE_LOCAL_JUDGE=0

WORKDIR /app/api
COPY --from=dependencies /app/api/.venv /app/api/.venv
COPY --from=frontend /frontend/dist /app/frontend_dist
COPY api/ /app/api/
RUN mkdir -p /app/api/sandbox && chown app:app /app/api/sandbox

USER 10001:10001
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["python", "-c", "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '10000') + '/healthz', timeout=3).read()"]
CMD ["sh", "-c", "exec uvicorn web:create_app --factory --host 0.0.0.0 --port \"${PORT:-10000}\""]
