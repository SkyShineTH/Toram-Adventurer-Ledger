# Validation Plan

This checklist defines the first validation layer before any data is loaded into PostgreSQL or used for recommendations/RAG.

## Scope

Validate read-only raw inputs from `data/raw/` and write outputs only to repo-owned processed or dead-letter locations.

Initial input files:

- `items.json`
- `maps.json`
- `monsters.json`
- `quests_data.json`
- `metadata.json`

## File-Level Checks

- Required files exist.
- Files contain valid JSON.
- Top-level data files are arrays where expected.
- `metadata.json` contains source, base URL, fetch timestamp, and endpoint summaries.
- Raw files are read-only inputs; scripts must not rewrite them.

## Record-Level Checks

- Required ID fields are present and integer-like.
- Required display names or titles are present and non-empty.
- Numeric fields are numeric and non-negative where applicable.
- Boolean fields are boolean, not string labels.
- Nested objects match expected shape.
- Objective arrays contain objects with valid `text` when present.

## Uniqueness Checks

- `items.id` is unique.
- `maps.id` is unique.
- `monsters.id` is unique.
- `quests.quest_id` is unique.
- Future normalized `npcs.id` should be unique when extracted from quests.

## Relationship Checks

- Every `monsters.map_id` should exist in `maps.id`.
- Every quest objective `target_item_id` should exist in `items.id` when present.
- Every quest objective should link back to a valid `quest_id`.
- Denormalized names should be checked against referenced records when IDs are present.

## Dead-Letter Rules

Rows that fail validation should not be silently dropped.

For each invalid record, capture:

- source file
- source record index
- entity type
- record identifier if available
- validation error code
- validation message
- original record payload

Initial dead-letter output can be a JSONL file under a repo-owned generated-output path. Do not commit generated dead-letter outputs unless they are small intentional fixtures.

## Initial Error Codes

- `missing_required_field`
- `invalid_type`
- `empty_required_value`
- `duplicate_id`
- `missing_reference`
- `name_reference_mismatch`
- `invalid_json`
- `unsupported_schema`

## Minimum Acceptance Criteria

Before transformation logic is considered complete:

- validation runs before normalization
- invalid records are isolated
- summary counts are reported per entity
- duplicate IDs are reported
- missing references are reported
- raw files remain unchanged
