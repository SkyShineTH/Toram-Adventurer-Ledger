# Toram-Adventurer-Ledger

A data warehouse and AI recommendation system for Toram Online. The MVP turns local raw game data into validated PostgreSQL records, then exposes practical planning workflows through FastAPI and Next.js.

## What Works Now

- Validation-first ETL from `data/raw/` to `data/processed/`.
- PostgreSQL 16 with pgvector as the normal full-stack runtime.
- FastAPI repository layer that can run from processed JSONL or PostgreSQL.
- NetworkX-backed graph summaries, quest paths, and recommendation foundations.
- Next.js pages for dashboard, explorer, quality findings, search, recommendations, side quests, profile context, farming planner lite, and entity detail pages.
- CI gates for raw-data safety, Python checks, unit tests, Docker Compose config, PostgreSQL fixture loading, backend smoke checks, and frontend build.

## Data Safety Rules

- Keep raw Coryn/game cache files local-only under `data/raw/`.
- Do not commit raw data. Only `data/raw/README.md` belongs in Git.
- Do not edit files under `data/raw/` from scripts or agents.
- Run validation before generating processed data or loading PostgreSQL.
- Keep `.env`, generated processed data, and validation reports untracked.
- Do not commit secrets, API keys, credentials, or local machine paths.

## Full-Stack Docker Runbook

Create local environment settings:

```powershell
Copy-Item .env.example .env -Force
```

Place your local raw cache files under:

```text
data/raw/
```

Start PostgreSQL:

```powershell
docker compose up -d postgres
```

Run validation, generate processed JSONL, and load PostgreSQL:

```powershell
docker compose run --rm loader --allow-findings
```

Start backend and frontend:

```powershell
docker compose up -d --build backend frontend
```

Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/health`
- Backend readiness: `http://localhost:8000/ready`

After the database is already loaded, this is enough for normal startup:

```powershell
docker compose up -d postgres backend frontend
```

If frontend or backend routes look stale after code changes, rebuild the app images:

```powershell
docker compose up -d --build backend frontend
```

## Reset Local Database

This removes the local PostgreSQL Docker volume. Raw files remain untouched.

```powershell
docker compose down -v
docker compose up -d postgres
docker compose run --rm loader --allow-findings
docker compose up -d --build backend frontend
```

## Local Non-Docker Workflow

Install backend and ETL dependencies:

```powershell
py -m pip install -r backend/requirements.txt -r scripts/requirements.txt
```

Validate raw data:

```powershell
py scripts/02_validate_raw_data.py
```

Generate processed data:

```powershell
py scripts/01_extract_and_clean.py --allow-findings
```

Run the backend:

```powershell
uvicorn backend.main:app --reload
```

Run the frontend:

```powershell
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://127.0.0.1:8000` for API calls. In Docker, server-side frontend calls use `API_BASE_URL=http://backend:8000`.

## Environment Variables

Use `.env.example` as the local template. Important values:

- `DATABASE_URL`: PostgreSQL connection string.
- `LEDGER_REPOSITORY`: `postgres` for the full-stack runtime, `json` for processed JSONL fallback.
- `OPENAI_API_KEY`: reserved for future RAG/embedding work. Leave empty for the MVP.
- `API_BASE_URL`: server-side frontend API base URL.
- `NEXT_PUBLIC_API_BASE_URL`: browser-visible API base URL.

## Main App Routes

- `/`: dashboard and runtime overview.
- `/explorer`: paginated item, monster, and quest explorer.
- `/quality`: validation and data-quality findings.
- `/recommendations`: graph-based recommendation foundations.
- `/search`: lexical search over generated search documents.
- `/side-quests`: side quest helper by level and goal.
- `/profile`: URL-state build profile planner.
- `/farming`: farming and spina planner lite.
- `/items/[id]`, `/monsters/[id]`, `/maps/[id]`, `/quests/[id]`: entity detail pages.

## API Smoke Checks

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/ready
Invoke-RestMethod "http://localhost:8000/search?q=Sample&limit=1"
Invoke-RestMethod "http://localhost:8000/side-quests/recommendations?player_level=50&limit=1"
Invoke-RestMethod "http://localhost:8000/farming/plan?goal=quest_material&player_level=50&limit=1"
```

`/ready` should report `status: ready` after PostgreSQL has been loaded.

## Verification Before Commit

```powershell
py -m py_compile backend\config.py backend\main.py backend\repositories.py backend\graph.py backend\side_quests.py backend\farming.py scripts\01_extract_and_clean.py scripts\02_validate_raw_data.py scripts\03_load_postgres.py
py -m unittest discover -s tests
docker compose config
cd frontend
npm run build
```

## Common Problems

- `/ready` says `data_loaded: false`: run `docker compose run --rm loader --allow-findings`.
- Frontend cannot reach API in Docker: confirm `backend` is running and `API_BASE_URL=http://backend:8000` is present in compose.
- Frontend cannot reach API outside Docker: set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`.
- Validation fails on local raw data: inspect `reports/validation/` and fix the source capture outside this repo, or use `--allow-findings` only when the findings are understood.
- PostgreSQL schema looks stale: reset with `docker compose down -v`, then reload.

## MVP Limitations

- Search is lexical. Embeddings and RAG answering are planned but not implemented.
- Farming planner lite does not claim complete drop or market routes because normalized drop/market data is not available yet.
- Profile planner uses URL/form state only. No accounts or persistent build profiles yet.
- Gear recommendation is post-MVP until item stat/equipment coverage is confirmed.

## Contributor Workflow

- Read `.github/copilot-instructions.md` before agent or code work.
- Keep commits small and scoped by concern.
- Update docs when changing schema, ETL behavior, API behavior, or contributor commands.
- Run the relevant verification commands before committing.
- Do not push directly unless the project owner asks for it.
