# Data Contract

This document defines the initial raw-data contract for Toram-Adventurer-Ledger. It is based on read-only inspection of the repo-local raw files under `data/raw/`.

## Raw Data Location

Raw JSON files are stored inside this repo at:

`data/raw/`

Current files:

- `items.json`
- `maps.json`
- `monsters.json`
- `quests_data.json`
- `metadata.json`

Do not modify these raw files from project scripts. Pipeline outputs should be written under repo-owned processed or dead-letter locations.

## Source Metadata

Observed metadata source:

- `source`: Coryn Club public API
- `base_url`: `https://coryn.club/api/v1`
- `fetched_at`: ISO-8601 timestamp
- `endpoints`: source endpoint summaries with record counts, reported totals, page offsets, page counts, URLs, and raw page paths

Every normalized record should retain source traceability when practical:

- `source_url`
- `captured_at`
- `verified_status`
- `patch_version`

If a field is unavailable from raw input, the pipeline should explicitly set a null/default value and document the fallback.

Coryn uses negative sentinel values in selected numeric availability fields. The validation layer treats these as known unknown/unavailable values only for documented fields such as item sell/process values and monster HP/EXP/element values.

## Observed Record Counts

Initial read-only profile:

- `items.json`: 8391 records, no duplicate `id` values observed
- `maps.json`: 646 records, no duplicate `id` values observed
- `monsters.json`: 3441 records, no duplicate `id` values observed
- `quests_data.json`: 101 records, no duplicate `quest_id` values observed

These counts are baselines, not hard-coded business rules. Future data refreshes may legitimately change them.

## Items

Raw file: `data/raw/items.json`

Observed fields:

| Field | Expected Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | integer | yes | Primary item identifier. |
| `name` | string | yes | Item display name. |
| `type_id` | integer | yes | Source item type identifier. |
| `type_label` | string | yes | Source item type label, e.g. `[Additional]`. |
| `sell` | integer | no | NPC sell value when available. |
| `process` | integer | no | Processing value when available. |
| `process_amount` | integer | no | Processing material amount when available. |
| `meta` | object | no | Source metadata object. |
| `meta.badge` | string | no | Optional source badge. |
| `meta.note` | string | no | Optional source note. |

Initial normalized target:

- `items`
- possible future lookup table: `item_types`

## Maps

Raw file: `data/raw/maps.json`

Observed fields:

| Field | Expected Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | integer | yes | Primary map identifier. |
| `name` | string | yes | Map display name. |

Initial normalized target:

- `maps`

## Monsters

Raw file: `data/raw/monsters.json`

Observed fields:

| Field | Expected Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | integer | yes | Primary monster identifier. |
| `name` | string | yes | Monster display name. |
| `level` | integer | no | Monster level. |
| `map_id` | integer | yes | Foreign-key-like reference to `maps.id`. |
| `map_name` | string | no | Source map name denormalization. |
| `type_code` | string | no | Source monster type code. |
| `type_label` | string | no | Source monster type label. |
| `mode` | string | no | Difficulty or mode label. |
| `hp` | integer | no | Monster HP. |
| `exp` | integer | no | EXP reward. |
| `element_id` | integer | no | Source element identifier. |
| `element_label` | string | no | Source element label. |
| `tameable` | boolean | no | Whether monster is tameable. |
| `limited` | boolean | no | Whether monster is limited. |
| `meta` | object | no | Source metadata object. |
| `meta.badge` | string | no | Optional source badge. |
| `meta.note` | string | no | Optional source note. |

Initial normalized targets:

- `monsters`
- possible future lookup tables: `monster_types`, `elements`

Relationship to validate:

- `monsters.map_id -> maps.id`

## Quests

Raw file: `data/raw/quests_data.json`

Observed fields:

| Field | Expected Type | Required | Notes |
| --- | --- | --- | --- |
| `quest_id` | integer | yes | Primary quest identifier. |
| `title` | string | yes | Quest display title. |
| `type` | string | yes | Quest type, e.g. `Side Quest`. |
| `lv_req` | integer | no | Required player level. |
| `exp_reward` | integer | no | Quest EXP reward. |
| `npc` | object | no | Quest NPC object. |
| `npc.id` | integer | no | NPC identifier when available. |
| `npc.name` | string | no | NPC display name. |
| `objectives` | array | no | Quest objective rows. |
| `objectives[].text` | string | yes when objective exists | Source objective text. |
| `objectives[].target_item_id` | integer | no | Item target reference when objective is item-based. |
| `objectives[].target_item_name` | string | no | Source item name denormalization. |

Initial normalized targets:

- `quests`
- `npcs`
- `quest_objectives`

Relationships to validate:

- `quest_objectives.quest_id -> quests.quest_id`
- `quest_objectives.target_item_id -> items.id` when `target_item_id` is present

## Graph and RAG Readiness

The normalized model should preserve traversable edges:

- `maps -> monsters`
- `monsters -> drops` when drop data is available
- `drops -> items` when drop data is available
- `quests -> quest_objectives`
- `quest_objectives -> items`
- `quests -> npcs`

RAG-ready text should be derived from validated normalized records, not directly from raw JSON.
