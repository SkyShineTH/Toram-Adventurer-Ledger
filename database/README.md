# Database

Database workspace for PostgreSQL and pgvector schema assets.

Current schema draft:

- `schema/001_initial_schema.sql`

The MVP uses file-backed processed JSONL before PostgreSQL is introduced.

The backend currently reads generated JSONL through a repository abstraction. PostgreSQL should be introduced
by adding a repository implementation behind the same interface rather than changing route contracts.
