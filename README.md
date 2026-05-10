# Toram-Adventurer-Ledger

A data warehouse and AI recommendation system (RAG) for Toram Online, transforming raw game data into actionable insights for efficient, casual gameplay.

## Current MVP Shape

- Raw Coryn cache lives locally under `data/raw/` and is ignored by Git.
- Validation runs before processed data generation.
- Processed JSONL files power a file-backed FastAPI API.
- A manually scaffolded Next.js frontend shows the Smart Play dashboard and explorer.

## Local Workflow

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
