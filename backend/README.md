# Backend

File-backed FastAPI API for the Smart Play MVP.

Routes use the repository abstraction in `backend/repositories.py`. See `docs/backend-data-access.md`
for the PostgreSQL migration direction.

Set `LEDGER_REPOSITORY=postgres` with `DATABASE_URL` to read from PostgreSQL after loading data.
The default remains `LEDGER_REPOSITORY=json` for local MVP work without Docker.
Local `.env` values are loaded from the repo root. Existing shell environment variables take precedence.

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
- `GET /ready`
- `GET /validation/summary`
- `GET /validation/findings?limit=&offset=`
- `GET /dashboard/smart-play`
- `GET /graph/summary`
- `GET /graph/items/{item_id}/quest-paths?limit=`
- `GET /recommendations/quests?player_level=&limit=`
- `GET /recommendations/leveling?player_level=&window=&limit=`
- `GET /side-quests/recommendations?player_level=&goal=balanced|exp|item_collection&limit=`
- `GET /farming/plan?goal=balanced|npc_sell|quest_material&player_level=&limit=`
- `GET /search?q=&entity_type=&limit=`
- `GET /items?q=&type_label=&min_sell=&max_sell=`
- `GET /items/{item_id}`
- `GET /maps`
- `GET /maps/{map_id}`
- `GET /monsters?q=&type_label=&element_label=&min_level=&max_level=&map_id=`
- `GET /monsters/{monster_id}`
- `GET /quests?q=&quest_type=&npc_name=&min_level=&max_level=&min_exp=`
- `GET /quests/{quest_id}`
- `GET /relationships/item/{item_id}/quests`

`/side-quests/recommendations` returns ranked quest candidates with `required_items`,
`npc_name`, `exp_per_objective`, `score`, and a short `reason`. The route only ranks
quests available at or below `player_level`; it does not invent requirements that are
not present in validated quest objective data.

`/farming/plan` returns target items for NPC sell value and quest material planning.
It explicitly reports that drop locations are not ranked until validated
Monster -> Drop -> Item relationships exist in the warehouse.
