FROM python:3.12-slim-bookworm AS dependencies

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
ENV UV_PYTHON_DOWNLOADS=never \
    UV_LINK_MODE=copy

WORKDIR /app/api
COPY README.md /app/README.md
COPY api/pyproject.toml api/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project --no-cache --python /usr/local/bin/python

FROM python:3.12-slim-bookworm AS runtime

# GCC/libc compile C submissions; ncurses-bin provides tput for tester colors.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       bash gcc libc6-dev binutils diffutils coreutils ncurses-bin \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --create-home app

ENV PATH="/app/api/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENABLE_LOCAL_JUDGE=0

WORKDIR /app/api
COPY --from=dependencies /app/api/.venv /app/api/.venv
COPY README.md /app/README.md
COPY api/ /app/api/
RUN mkdir -p /app/api/sandbox && chown app:app /app/api/sandbox

USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/openapi.json', timeout=3).read()"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
