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

## Run the frontend

In a second terminal, from the repository root:

```sh
cd frontend/mencho_shell
npm install
npm run dev
```

Open the URL printed by Vite. The three pages are the overview, problemset,
and individual problem statements. The frontend uses Material UI with a custom
dark theme. Keep the backend running on port 8000; Vite proxies `/api` requests
to it during development. Production hosting needs the same `/api` proxy.
