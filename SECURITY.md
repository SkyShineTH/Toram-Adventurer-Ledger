# Security Policy

## Reporting

Report security, secret leakage, or data redistribution concerns privately to the repository owner.

Do not open a public issue containing:

- API keys
- credentials
- `.env` contents
- raw Coryn cache files
- links to private logs or local-only generated artifacts

## Data Handling

Raw Coryn API cache files are local-only development inputs. Do not commit or redistribute them unless rights are explicitly confirmed.

Allowed in Git:

- source code
- documentation
- small synthetic fixtures
- `data/raw/README.md`

Not allowed in Git:

- `data/raw/*.json`
- `data/raw/items/`
- `data/raw/maps/`
- `data/raw/monsters/`
- generated processed data
- generated validation reports

