# Data Quality Findings

Latest validation run finds three issues in the local Coryn raw cache.

## Findings

- `items.id=8159` has an empty `type_label`.
- `items.id=7620` has an empty `type_label`.
- `quests.quest_id=74` has an objective referencing missing `target_item_id=375`.

## Current Handling

- Raw files remain unchanged.
- Processed output normalizes known negative sentinel values to `null`.
- Processed output can still be generated with `--allow-findings` so the UI/API can run while these issues remain visible.
- Validation strict mode should still fail until these findings are resolved or downgraded by an explicit rule.

