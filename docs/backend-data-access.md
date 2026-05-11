# Backend Data Access

The API currently uses a file-backed repository over generated JSON/JSONL artifacts:

- `data/processed/*.jsonl`
- `data/processed/smart_play_summary.json`
- `reports/validation/summary.json`
- `reports/validation/dead_letter.jsonl`

The FastAPI routes depend on the `LedgerRepository` protocol in `backend/repositories.py`, not on raw files directly. This keeps endpoint contracts stable while the storage layer moves toward PostgreSQL and `pgvector`.

## Migration Direction

Recommended next storage steps:

1. Keep JSONL as the local MVP source until the schema stabilizes.
2. Load validated processed rows into the schema under `database/schema/001_initial_schema.sql`.
3. Switch repository construction with `LEDGER_REPOSITORY=postgres`.
4. Use the local Docker Compose stack when contributors need a shared PostgreSQL/pgvector runtime.

Docker is available for PostgreSQL, but the backend still defaults to JSONL until `LEDGER_REPOSITORY=postgres`
is explicitly set.
