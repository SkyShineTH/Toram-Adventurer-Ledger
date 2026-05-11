# Backend

File-backed FastAPI API for the Smart Play MVP.

Routes use the repository abstraction in `backend/repositories.py`. See `docs/backend-data-access.md`
for the PostgreSQL migration direction.

Set `LEDGER_REPOSITORY=postgres` with `DATABASE_URL` to read from PostgreSQL after loading data.
The default remains `LEDGER_REPOSITORY=json` for local MVP work without Docker.

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
- `GET /validation/findings?limit=&offset=`
- `GET /dashboard/smart-play`
- `GET /items?q=&type_label=&min_sell=&max_sell=`
- `GET /maps`
- `GET /monsters?q=&type_label=&element_label=&min_level=&max_level=&map_id=`
- `GET /quests?q=&quest_type=&npc_name=&min_level=&max_level=&min_exp=`
- `GET /relationships/item/{item_id}/quests`
