# Raw Data

This directory is for local-only raw data caches used during development.

Do not commit Coryn Club raw API cache files unless redistribution rights are confirmed.

Expected local files:

- `items.json`
- `maps.json`
- `monsters.json`
- `quests_data.json`
- `metadata.json`
- endpoint page folders such as `items/`, `maps/`, and `monsters/`

Pipeline code should treat everything in this directory as immutable input.
