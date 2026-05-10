# Contributing

Thanks for helping improve Toram-Adventurer-Ledger. This project is data-sensitive: raw Coryn API cache files are local-only and must not be committed.

## Ground Rules

- Do not commit files under `data/raw/` except `data/raw/README.md`.
- Do not commit generated files under `data/processed/` or `reports/validation/`.
- Do not commit `.env`, secrets, API keys, credentials, or local machine paths.
- Keep pull requests scoped to one concern: data, API, frontend, docs, or tooling.
- If you change data logic, update docs and run validation.
- If you change UI, include screenshots or a short visual summary in the PR.

## Setup

Backend:

```bash
pip install -r backend/requirements.txt
```

Frontend:

```bash
cd frontend
npm install
```

Local raw data:

- Put your private/local raw cache in `data/raw/`.
- Keep raw cache files untracked.
- Use `data/raw/README.md` for expected file names.

## Common Commands

Validate local raw data:

```bash
py scripts/02_validate_raw_data.py
```

Generate processed data:

```bash
py scripts/01_extract_and_clean.py --allow-findings
```

Run backend:

```bash
uvicorn backend.main:app --reload
```

Build frontend:

```bash
cd frontend
npm run build
```

## PR Checklist

- Raw data cache is not committed.
- Generated reports and processed outputs are not committed.
- Validation was run or the reason it was not run is documented.
- Relevant docs were updated.
- Frontend changes include screenshots or a short visual summary.
- Backend/API changes document endpoint behavior.

## Commit Guidance

Use small commits by concern:

- `feat(data): ...`
- `feat(api): ...`
- `feat(frontend): ...`
- `docs: ...`
- `chore: ...`

