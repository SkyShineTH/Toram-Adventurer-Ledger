# Development Workflow

## Data Work

Use this flow when changing validation, extraction, normalization, schema, or data quality rules:

1. Keep `data/raw/` read-only.
2. Run `py scripts/02_validate_raw_data.py`.
3. If processed output is needed, run `py scripts/01_extract_and_clean.py --allow-findings`.
4. Review generated files under `reports/validation/`.
5. Do not commit generated reports or processed JSONL files.
6. Update `docs/data-contract.md`, `docs/validation-plan.md`, or `docs/data-quality-findings.md` when behavior changes.

## Backend Work

Use this flow when changing FastAPI code:

1. Ensure processed files exist locally with `py scripts/01_extract_and_clean.py --allow-findings`.
2. Run `py -m py_compile backend/main.py`.
3. Smoke-test key functions or run the server:

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

## Frontend Work

Use this flow when changing the Next.js app:

1. Install dependencies from `frontend/` with `npm install`.
2. Run `npm run build`.
3. If changing visible UI, include screenshots or a short visual review note in the PR.
4. Preserve the cartographer-ledger design direction in `.impeccable.md`.

## Review Boundaries

- Data contract changes need extra review.
- Raw-data handling changes need extra review.
- Dependency upgrades need a short risk note when security-related.
- PostgreSQL/RAG runtime wiring should be introduced in separate focused PRs.

