from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


RAW_FILES = {
    "items": "items.json",
    "maps": "maps.json",
    "monsters": "monsters.json",
    "quests": "quests_data.json",
    "metadata": "metadata.json",
}


SCHEMAS: dict[str, dict[str, Any]] = {
    "items": {
        "id_field": "id",
        "required": {
            "id": int,
            "name": str,
            "type_id": int,
            "type_label": str,
        },
        "optional": {
            "sell": int,
            "process": int,
            "process_amount": int,
            "meta": dict,
        },
        "non_negative": {"id", "type_id", "sell", "process", "process_amount"},
        "negative_sentinel_fields": {"sell", "process", "process_amount"},
    },
    "maps": {
        "id_field": "id",
        "required": {
            "id": int,
            "name": str,
        },
        "optional": {},
        "non_negative": {"id"},
        "negative_sentinel_fields": set(),
    },
    "monsters": {
        "id_field": "id",
        "required": {
            "id": int,
            "name": str,
            "map_id": int,
        },
        "optional": {
            "level": int,
            "map_name": str,
            "type_code": str,
            "type_label": str,
            "mode": str,
            "hp": int,
            "exp": int,
            "element_id": int,
            "element_label": str,
            "tameable": bool,
            "limited": bool,
            "meta": dict,
        },
        "non_negative": {"id", "level", "map_id", "hp", "exp", "element_id"},
        "negative_sentinel_fields": {"hp", "exp", "element_id"},
    },
    "quests": {
        "id_field": "quest_id",
        "required": {
            "quest_id": int,
            "title": str,
            "type": str,
        },
        "optional": {
            "lv_req": int,
            "exp_reward": int,
            "npc": dict,
            "objectives": list,
        },
        "non_negative": {"quest_id", "lv_req", "exp_reward"},
        "negative_sentinel_fields": set(),
    },
}


class ValidationResult:
    def __init__(self) -> None:
        self.errors: list[dict[str, Any]] = []
        self.counts: dict[str, Any] = {
            "files": {},
            "records": {},
            "errors_by_code": Counter(),
            "errors_by_entity": Counter(),
        }

    def add_error(
        self,
        *,
        entity: str,
        source_file: str,
        code: str,
        message: str,
        index: int | None = None,
        record_id: Any = None,
        record: Any = None,
    ) -> None:
        payload = {
            "entity": entity,
            "source_file": source_file,
            "source_record_index": index,
            "record_id": record_id,
            "error_code": code,
            "message": message,
            "record": record,
        }
        self.errors.append(payload)
        self.counts["errors_by_code"][code] += 1
        self.counts["errors_by_entity"][entity] += 1


def load_json(path: Path, entity: str, result: ValidationResult) -> Any:
    if not path.exists():
        result.add_error(
            entity=entity,
            source_file=str(path),
            code="missing_required_file",
            message=f"Required file does not exist: {path}",
        )
        return None

    result.counts["files"][entity] = str(path)
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except json.JSONDecodeError as exc:
        result.add_error(
            entity=entity,
            source_file=str(path),
            code="invalid_json",
            message=f"Invalid JSON: {exc}",
        )
    return None


def is_expected_type(value: Any, expected: type) -> bool:
    if expected is int:
        return isinstance(value, int) and not isinstance(value, bool)
    return isinstance(value, expected)


def validate_required_fields(
    entity: str,
    source_file: str,
    row: dict[str, Any],
    index: int,
    result: ValidationResult,
) -> None:
    schema = SCHEMAS[entity]
    id_field = schema["id_field"]
    record_id = row.get(id_field)

    for field, expected_type in schema["required"].items():
        if field not in row:
            result.add_error(
                entity=entity,
                source_file=source_file,
                index=index,
                record_id=record_id,
                code="missing_required_field",
                message=f"Missing required field: {field}",
                record=row,
            )
            continue

        value = row[field]
        if not is_expected_type(value, expected_type):
            result.add_error(
                entity=entity,
                source_file=source_file,
                index=index,
                record_id=record_id,
                code="invalid_type",
                message=f"Field {field} expected {expected_type.__name__}, got {type(value).__name__}",
                record=row,
            )
            continue

        if expected_type is str and not value.strip():
            result.add_error(
                entity=entity,
                source_file=source_file,
                index=index,
                record_id=record_id,
                code="empty_required_value",
                message=f"Required string field is empty: {field}",
                record=row,
            )


def validate_optional_fields(
    entity: str,
    source_file: str,
    row: dict[str, Any],
    index: int,
    result: ValidationResult,
) -> None:
    schema = SCHEMAS[entity]
    id_field = schema["id_field"]
    record_id = row.get(id_field)

    for field, expected_type in schema["optional"].items():
        if field not in row or row[field] is None:
            continue
        value = row[field]
        if not is_expected_type(value, expected_type):
            result.add_error(
                entity=entity,
                source_file=source_file,
                index=index,
                record_id=record_id,
                code="invalid_type",
                message=f"Field {field} expected {expected_type.__name__}, got {type(value).__name__}",
                record=row,
            )


def validate_non_negative(
    entity: str,
    source_file: str,
    row: dict[str, Any],
    index: int,
    result: ValidationResult,
) -> None:
    schema = SCHEMAS[entity]
    id_field = schema["id_field"]
    record_id = row.get(id_field)

    for field in schema["non_negative"]:
        value = row.get(field)
        negative_sentinel_fields = schema.get("negative_sentinel_fields", set())
        if (
            field in negative_sentinel_fields
            and isinstance(value, int)
            and not isinstance(value, bool)
            and value < 0
        ):
            counter_key = f"{entity}_{field}_sentinel_values"
            result.counts["records"][counter_key] = result.counts["records"].get(counter_key, 0) + 1
            continue
        if isinstance(value, int) and not isinstance(value, bool) and value < 0:
            result.add_error(
                entity=entity,
                source_file=source_file,
                index=index,
                record_id=record_id,
                code="invalid_value",
                message=f"Field {field} must be non-negative",
                record=row,
            )


def validate_metadata(metadata: Any, source_file: str, result: ValidationResult) -> None:
    if not isinstance(metadata, dict):
        result.add_error(
            entity="metadata",
            source_file=source_file,
            code="unsupported_schema",
            message="metadata.json must contain a JSON object",
            record=metadata,
        )
        return

    required_fields = {
        "source": str,
        "base_url": str,
        "fetched_at": str,
        "endpoints": list,
    }
    for field, expected_type in required_fields.items():
        if field not in metadata:
            result.add_error(
                entity="metadata",
                source_file=source_file,
                code="missing_required_field",
                message=f"Missing required metadata field: {field}",
                record=metadata,
            )
        elif not is_expected_type(metadata[field], expected_type):
            result.add_error(
                entity="metadata",
                source_file=source_file,
                code="invalid_type",
                message=f"Metadata field {field} expected {expected_type.__name__}",
                record=metadata,
            )

    result.counts["records"]["metadata_endpoints"] = len(metadata.get("endpoints", []))


def validate_entity_records(
    entity: str,
    records: Any,
    source_file: str,
    result: ValidationResult,
) -> set[int]:
    if not isinstance(records, list):
        result.add_error(
            entity=entity,
            source_file=source_file,
            code="unsupported_schema",
            message=f"{source_file} must contain a JSON array",
            record=records,
        )
        return set()

    schema = SCHEMAS[entity]
    id_field = schema["id_field"]
    result.counts["records"][entity] = len(records)
    ids: list[int] = []

    for index, row in enumerate(records):
        if not isinstance(row, dict):
            result.add_error(
                entity=entity,
                source_file=source_file,
                index=index,
                code="unsupported_schema",
                message="Record must be a JSON object",
                record=row,
            )
            continue

        validate_required_fields(entity, source_file, row, index, result)
        validate_optional_fields(entity, source_file, row, index, result)
        validate_non_negative(entity, source_file, row, index, result)

        record_id = row.get(id_field)
        if isinstance(record_id, int) and not isinstance(record_id, bool):
            ids.append(record_id)

        if entity == "quests":
            validate_quest_nested_fields(row, source_file, index, result)

    duplicate_ids = [record_id for record_id, count in Counter(ids).items() if count > 1]
    result.counts["records"][f"{entity}_duplicate_ids"] = len(duplicate_ids)
    for duplicate_id in duplicate_ids:
        result.add_error(
            entity=entity,
            source_file=source_file,
            record_id=duplicate_id,
            code="duplicate_id",
            message=f"Duplicate {id_field}: {duplicate_id}",
        )

    return set(ids)


def validate_quest_nested_fields(
    row: dict[str, Any],
    source_file: str,
    index: int,
    result: ValidationResult,
) -> None:
    quest_id = row.get("quest_id")
    npc = row.get("npc")
    if npc is not None:
        if not isinstance(npc, dict):
            result.add_error(
                entity="quests",
                source_file=source_file,
                index=index,
                record_id=quest_id,
                code="invalid_type",
                message="Field npc expected object",
                record=row,
            )
        else:
            validate_nested_optional_type("quests", source_file, row, index, result, "npc.id", npc.get("id"), int)
            validate_nested_optional_type("quests", source_file, row, index, result, "npc.name", npc.get("name"), str)

    objectives = row.get("objectives")
    if objectives is None:
        return
    if not isinstance(objectives, list):
        result.add_error(
            entity="quests",
            source_file=source_file,
            index=index,
            record_id=quest_id,
            code="invalid_type",
            message="Field objectives expected array",
            record=row,
        )
        return

    for objective_index, objective in enumerate(objectives):
        if not isinstance(objective, dict):
            result.add_error(
                entity="quest_objectives",
                source_file=source_file,
                index=index,
                record_id=quest_id,
                code="unsupported_schema",
                message=f"Objective {objective_index} must be an object",
                record=row,
            )
            continue
        text = objective.get("text")
        if not isinstance(text, str) or not text.strip():
            result.add_error(
                entity="quest_objectives",
                source_file=source_file,
                index=index,
                record_id=quest_id,
                code="empty_required_value",
                message=f"Objective {objective_index} requires non-empty text",
                record=row,
            )
        validate_nested_optional_type(
            "quest_objectives",
            source_file,
            row,
            index,
            result,
            f"objectives[{objective_index}].target_item_id",
            objective.get("target_item_id"),
            int,
        )
        validate_nested_optional_type(
            "quest_objectives",
            source_file,
            row,
            index,
            result,
            f"objectives[{objective_index}].target_item_name",
            objective.get("target_item_name"),
            str,
        )


def validate_nested_optional_type(
    entity: str,
    source_file: str,
    row: dict[str, Any],
    index: int,
    result: ValidationResult,
    field: str,
    value: Any,
    expected_type: type,
) -> None:
    if value is None:
        return
    if not is_expected_type(value, expected_type):
        result.add_error(
            entity=entity,
            source_file=source_file,
            index=index,
            record_id=row.get("quest_id"),
            code="invalid_type",
            message=f"Field {field} expected {expected_type.__name__}, got {type(value).__name__}",
            record=row,
        )


def validate_relationships(
    raw_data: dict[str, Any],
    ids_by_entity: dict[str, set[int]],
    result: ValidationResult,
) -> None:
    map_ids = ids_by_entity.get("maps", set())
    item_ids = ids_by_entity.get("items", set())

    for index, monster in enumerate(raw_data.get("monsters") or []):
        if not isinstance(monster, dict):
            continue
        map_id = monster.get("map_id")
        if isinstance(map_id, int) and not isinstance(map_id, bool) and map_id not in map_ids:
            result.add_error(
                entity="monsters",
                source_file=RAW_FILES["monsters"],
                index=index,
                record_id=monster.get("id"),
                code="missing_reference",
                message=f"Monster map_id does not exist in maps.id: {map_id}",
                record=monster,
            )

    for quest_index, quest in enumerate(raw_data.get("quests") or []):
        if not isinstance(quest, dict):
            continue
        for objective_index, objective in enumerate(quest.get("objectives") or []):
            if not isinstance(objective, dict):
                continue
            target_item_id = objective.get("target_item_id")
            if (
                isinstance(target_item_id, int)
                and not isinstance(target_item_id, bool)
                and target_item_id not in item_ids
            ):
                result.add_error(
                    entity="quest_objectives",
                    source_file=RAW_FILES["quests"],
                    index=quest_index,
                    record_id=quest.get("quest_id"),
                    code="missing_reference",
                    message=(
                        f"Quest objective {objective_index} target_item_id "
                        f"does not exist in items.id: {target_item_id}"
                    ),
                    record=quest,
                )


def write_outputs(result: ValidationResult, out_dir: Path) -> dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    error_count = len(result.errors)
    summary = {
        "generated_at": generated_at,
        "passed": error_count == 0,
        "error_count": error_count,
        "counts": {
            "files": result.counts["files"],
            "records": result.counts["records"],
            "errors_by_code": dict(result.counts["errors_by_code"]),
            "errors_by_entity": dict(result.counts["errors_by_entity"]),
        },
    }

    summary_path = out_dir / "summary.json"
    dead_letter_path = out_dir / "dead_letter.jsonl"
    markdown_path = out_dir / "summary.md"

    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    with dead_letter_path.open("w", encoding="utf-8") as handle:
        for error in result.errors:
            handle.write(json.dumps(error, ensure_ascii=False) + "\n")

    markdown_path.write_text(render_markdown(summary), encoding="utf-8")

    return {
        "summary": str(summary_path),
        "dead_letter": str(dead_letter_path),
        "markdown": str(markdown_path),
    }


def render_markdown(summary: dict[str, Any]) -> str:
    records = summary["counts"]["records"]
    errors_by_code = summary["counts"]["errors_by_code"]
    errors_by_entity = summary["counts"]["errors_by_entity"]
    lines = [
        "# Raw Data Validation Summary",
        "",
        f"- Generated at: `{summary['generated_at']}`",
        f"- Passed: `{summary['passed']}`",
        f"- Error count: `{summary['error_count']}`",
        "",
        "## Records",
        "",
    ]
    for key in sorted(records):
        lines.append(f"- `{key}`: {records[key]}")

    lines.extend(["", "## Errors By Code", ""])
    if errors_by_code:
        for key in sorted(errors_by_code):
            lines.append(f"- `{key}`: {errors_by_code[key]}")
    else:
        lines.append("- none")

    lines.extend(["", "## Errors By Entity", ""])
    if errors_by_entity:
        for key in sorted(errors_by_entity):
            lines.append(f"- `{key}`: {errors_by_entity[key]}")
    else:
        lines.append("- none")

    lines.append("")
    return "\n".join(lines)


def validate(raw_dir: Path) -> ValidationResult:
    result = ValidationResult()
    raw_data: dict[str, Any] = {}
    ids_by_entity: dict[str, set[int]] = defaultdict(set)

    metadata_path = raw_dir / RAW_FILES["metadata"]
    metadata = load_json(metadata_path, "metadata", result)
    if metadata is not None:
        validate_metadata(metadata, RAW_FILES["metadata"], result)

    for entity in ("items", "maps", "monsters", "quests"):
        path = raw_dir / RAW_FILES[entity]
        data = load_json(path, entity, result)
        raw_data[entity] = data
        if data is not None:
            ids_by_entity[entity] = validate_entity_records(entity, data, RAW_FILES[entity], result)

    validate_relationships(raw_data, ids_by_entity, result)
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate local Toram raw JSON files.")
    parser.add_argument("--raw-dir", default="data/raw", type=Path, help="Local raw data directory.")
    parser.add_argument(
        "--out-dir",
        default="reports/validation",
        type=Path,
        help="Directory for generated validation reports.",
    )
    parser.add_argument(
        "--fail-on-errors",
        action="store_true",
        help="Exit with status 1 when validation errors are found.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    result = validate(args.raw_dir)
    output_paths = write_outputs(result, args.out_dir)

    print(f"Validation passed: {len(result.errors) == 0}")
    print(f"Error count: {len(result.errors)}")
    for label, path in output_paths.items():
        print(f"{label}: {path}")

    if args.fail_on_errors and result.errors:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
