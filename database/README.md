# Database

Database workspace for PostgreSQL and pgvector schema assets.

Current schema draft:

- `schema/001_initial_schema.sql`
- `init/00_enable_extensions.sql`
- `init/01_initial_schema.sql`

The MVP uses file-backed processed JSONL before PostgreSQL is introduced.

The backend currently reads generated JSONL through a repository abstraction. PostgreSQL should be introduced
by adding a repository implementation behind the same interface rather than changing route contracts.

## Local PostgreSQL

Run a local PostgreSQL 16 database with pgvector:

```bash
docker compose up -d postgres
```

The compose stack reads these local-only variables:

```bash
POSTGRES_DB=toram_ledger
POSTGRES_USER=toram
POSTGRES_PASSWORD=toram_local_password
POSTGRES_PORT=5432
DATABASE_URL=postgresql://toram:toram_local_password@localhost:5432/toram_ledger
```

Backend and loader commands read `.env` from the repo root. Shell variables still override `.env` when both are set.

Initialization scripts under `database/init/` run only when the Docker volume is first created. If the schema changes and
you need a fresh local database, remove the `toram_postgres_data` volume intentionally after confirming there is no local
data to keep.

Load the current processed dataset after running validation/ETL:

```bash
py scripts/03_load_postgres.py --allow-findings
```

Use `--skip-etl` only when `data/processed/` and `reports/validation/` are already current.

The loader also builds `search_documents`, a pgvector-ready document mart with nullable embeddings. Embeddings are
intentionally left empty until the embedding model and refresh workflow are selected.
