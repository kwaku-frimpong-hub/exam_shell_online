# Exam Shell Online

## Project structure

- `api/` — FastAPI backend, Python dependencies, question data, and tester resources.
- `frontend/` — frontend application.

## Run everything with Docker

Install Docker Engine/Desktop with Docker Compose v2. From the repository root:

```sh
docker compose up --build -d
```

Open **http://localhost:8080**. No host Python, Node, GCC, or virtual environment
is needed. The frontend image builds the app with Node and serves it using
Nginx. Requests to `/api/` are proxied to FastAPI over a private Docker network;
the API port is not published to the host. The backend image includes Python,
locked dependencies, Bash, GCC, libc headers, diff, coreutils, and tput.

Useful commands:

```sh
docker compose logs -f
docker compose ps
docker compose down
```

The default bind address is localhost and judging is **disabled**. To change
the port/address, copy `.env.example` to `.env` and edit `APP_PORT`/`APP_HOST`.
For example, `APP_HOST=0.0.0.0` exposes the app on your network; keep judging
disabled for shared/public access. Public hosting also needs HTTPS via a
reverse proxy or your hosting provider.

For **trusted local testing only**, enable the existing judge:

```sh
ENABLE_LOCAL_JUDGE=1 docker compose up --build -d
```

Disable it again using `ENABLE_LOCAL_JUDGE=0 docker compose up -d`.
Containers run as non-root with read-only root filesystems, dropped capabilities,
resource limits, and temporary scratch storage. The API network has no external
egress. **These are defense-in-depth settings, not a secure judge sandbox.**
Submissions still share the API container's user/process/network environment.
Do not enable judging for friends or public users until execution is moved to a
properly isolated judge worker. Nothing mounts the Docker socket or host source
tree into these containers.

Submission scratch files disappear when containers stop; results are not stored.
Container rebuilds include code/resource changes. Build contexts exclude local
environments, dependencies, submitted code, databases, and credential files.

## Run the backend

From the repository root:

```sh
cd api
uv sync
uv run fastapi dev main.py
```

To rebuild the question index, run `uv run python load_question_slug.py` from `api/`.

### Enable the local practice judge

Judging is disabled by default. For **trusted local development only**, run:

```sh
cd api
ENABLE_LOCAL_JUDGE=1 uv run fastapi dev main.py
```

`POST /questions/{slug}` accepts `{ "code": "...", "session_id": "<UUID>" }`
and returns a submission ID, status, tester output, and duration. Statuses are
`passed`, `failed`, `time_limit_exceeded`, or `judge_error`. These are the results
of the existing tester scripts, not a guarantee of correctness.

Each run gets a temporary copy of its exercise and a 10-second timeout, and
temporary files are cleaned up afterward. Results are returned immediately and
are not persisted. Bash and GCC must be installed (Linux).

**This is not a security sandbox. Do not enable it on a public server.**
Submitted C runs with the server user's permissions. Before accepting untrusted
code, move judging to an isolated worker with network, filesystem, CPU, memory,
and process restrictions. Timeouts and temporary directories do not provide that isolation.

## Run the frontend

In a second terminal, from the repository root:

```sh
cd frontend/mencho_shell
npm install
npm run dev
```

Open the URL printed by Vite. Pages include the overview, problemset,
individual problem statements, and exam practice. The frontend uses Material UI with a custom
dark theme. Keep the backend running on port 8000; Vite proxies `/api` requests
to it during development. Production hosting needs the same `/api` proxy.

### Exam practice

Open **Exam practice** in the navigation (`#/exams`) to generate a Rank 02 set
using `GET /exams/rank02`. The API selects one random question per available
level. Only the first question is revealed initially. Passing its tester checks
reveals the next question; later questions remain hidden and navigation to them
is disabled until every preceding question has passed.

This is untimed practice, not an official exam session. The selected question
set survives refreshes in the current browser tab, but pass markers reset when
leaving the page. Code is never saved and clears when switching questions.
Generating a fresh set asks for confirmation.

Progression is a frontend practice feature, not server-enforced exam security:
the current API still returns the full question set.
