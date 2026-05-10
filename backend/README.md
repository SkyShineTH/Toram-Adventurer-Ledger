# Backend

File-backed FastAPI API for the Milestone 6 MVP.

Before running the API, generate processed data:

```bash
py scripts/01_extract_and_clean.py --allow-findings
```

Run from the repo root:

```bash
uvicorn backend.main:app --reload
```

Key endpoints:

- `GET /health`
- `GET /validation/summary`
- `GET /dashboard/smart-play`
- `GET /items`
- `GET /maps`
- `GET /monsters`
- `GET /quests`

