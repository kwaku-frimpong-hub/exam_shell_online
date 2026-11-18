# Exam Shell Online

## Project structure

- `api/` — FastAPI backend, Python dependencies, question data, and tester resources.
- `frontend/` — frontend application.

## Run the backend

From the repository root:

```sh
cd api
uv sync
uv run fastapi dev main.py
```

To rebuild the question index, run `uv run python load_question_slug.py` from `api/`.
