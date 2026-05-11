# Toram-Adventurer-Ledger

A data warehouse and AI recommendation system (RAG) for Toram Online, transforming raw game data into actionable insights for efficient, casual gameplay.

## Current MVP Shape

- Raw Coryn cache lives locally under `data/raw/` and is ignored by Git.
- Validation runs before processed data generation.
- Processed JSONL files can be loaded into PostgreSQL/pgvector.
- FastAPI can run against JSONL or PostgreSQL through the repository layer.
- Next.js provides dashboard, explorer, quality, recommendations, and search pages.

## Full-Stack Docker Workflow

Create local environment settings:

```bash
cp .env.example .env
```

Place Coryn/raw API cache files under `data/raw/`. Raw files stay local-only and are ignored by Git.

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Run validation, processed-data generation, and PostgreSQL loading:

```bash
docker compose run --rm loader --allow-findings
```

Start the app:

```bash
docker compose up -d backend frontend
```

Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/health`
- Backend readiness: `http://localhost:8000/ready`

Use `docker compose up -d postgres backend frontend` after the database has already been loaded.

## Local Non-Docker Workflow

Generate validation reports:

```bash
py scripts/02_validate_raw_data.py
```

Generate processed data for the API/UI:

```bash
py scripts/01_extract_and_clean.py --allow-findings
```

Run the backend:

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://127.0.0.1:8000` for API calls.
