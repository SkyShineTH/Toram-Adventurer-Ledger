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
2. Add a `PostgresLedgerRepository` that implements the same `LedgerRepository` protocol.
3. Load validated processed rows into the schema under `database/schema/001_initial_schema.sql`.
4. Switch repository construction with an environment variable such as `LEDGER_REPOSITORY=postgres`.
5. Add Docker Compose only when contributors need a shared local PostgreSQL/pgvector runtime.

Docker is intentionally not required for the current Milestone 10 abstraction. The current goal is to avoid coupling route behavior to file I/O before the API contracts settle.
