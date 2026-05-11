from __future__ import annotations

import argparse
import importlib.util
import json
import os
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
ETL_PATH = ROOT / "scripts" / "01_extract_and_clean.py"
PROCESSED_DIR = ROOT / "data" / "processed"
VALIDATION_DIR = ROOT / "reports" / "validation"


def load_etl_module():
    spec = importlib.util.spec_from_file_location("extract_and_clean", ETL_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load ETL module from {ETL_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def ordered_values(row: dict[str, Any], columns: Iterable[str]) -> tuple[Any, ...]:
    return tuple(row.get(column) for column in columns)


def sanitize_quest_objectives(
    objectives: list[dict[str, Any]],
    item_ids: set[int],
) -> list[dict[str, Any]]:
    sanitized: list[dict[str, Any]] = []
    for objective in objectives:
        next_row = dict(objective)
        target_item_id = next_row.get("target_item_id")
        if target_item_id is not None and target_item_id not in item_ids:
            next_row["target_item_id"] = None
        sanitized.append(next_row)
    return sanitized


def attach_snapshot_id(rows: list[dict[str, Any]], snapshot_id: int) -> list[dict[str, Any]]:
    return [{**row, "source_snapshot_id": snapshot_id} for row in rows]


def compact_metadata(row: dict[str, Any], keys: list[str]) -> dict[str, Any]:
    return {key: row.get(key) for key in keys if row.get(key) is not None}


def build_search_documents(
    items: list[dict[str, Any]],
    maps: list[dict[str, Any]],
    monsters: list[dict[str, Any]],
    quests: list[dict[str, Any]],
    objectives: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []

    for item in items:
        documents.append(
            {
                "id": f"item:{item.get('id')}",
                "entity_type": "item",
                "entity_id": str(item.get("id")),
                "title": item.get("name") or f"Item {item.get('id')}",
                "content": " ".join(
                    part
                    for part in [
                        item.get("name"),
                        item.get("type_label"),
                        item.get("note"),
                        f"sell {item.get('sell')}" if item.get("sell") is not None else None,
                    ]
                    if part
                ),
                "metadata": compact_metadata(item, ["type_label", "sell", "process", "process_amount"]),
            }
        )

    for game_map in maps:
        documents.append(
            {
                "id": f"map:{game_map.get('id')}",
                "entity_type": "map",
                "entity_id": str(game_map.get("id")),
                "title": game_map.get("name") or f"Map {game_map.get('id')}",
                "content": game_map.get("name") or "",
                "metadata": {},
            }
        )

    for monster in monsters:
        documents.append(
            {
                "id": f"monster:{monster.get('id')}",
                "entity_type": "monster",
                "entity_id": str(monster.get("id")),
                "title": monster.get("name") or f"Monster {monster.get('id')}",
                "content": " ".join(
                    part
                    for part in [
                        monster.get("name"),
                        monster.get("map_name"),
                        monster.get("type_label"),
                        monster.get("element_label"),
                        f"level {monster.get('level')}" if monster.get("level") is not None else None,
                        f"exp {monster.get('exp')}" if monster.get("exp") is not None else None,
                    ]
                    if part
                ),
                "metadata": compact_metadata(monster, ["level", "map_id", "map_name", "element_label", "exp", "type_label"]),
            }
        )

    objectives_by_quest: dict[int, list[dict[str, Any]]] = {}
    for objective in objectives:
        quest_id = objective.get("quest_id")
        if isinstance(quest_id, int):
            objectives_by_quest.setdefault(quest_id, []).append(objective)

    for quest in quests:
        quest_objectives = objectives_by_quest.get(quest.get("id"), [])
        objective_text = " ".join(str(objective.get("text") or "") for objective in quest_objectives)
        documents.append(
            {
                "id": f"quest:{quest.get('id')}",
                "entity_type": "quest",
                "entity_id": str(quest.get("id")),
                "title": quest.get("title") or f"Quest {quest.get('id')}",
                "content": " ".join(
                    part
                    for part in [
                        quest.get("title"),
                        quest.get("type"),
                        quest.get("npc_name"),
                        f"level {quest.get('level_required')}" if quest.get("level_required") is not None else None,
                        f"exp {quest.get('exp_reward')}" if quest.get("exp_reward") is not None else None,
                        objective_text,
                    ]
                    if part
                ),
                "metadata": compact_metadata(quest, ["type", "level_required", "exp_reward", "npc_name"])
                | {"objective_count": len(quest_objectives)},
            }
        )

    return documents


def execute_values(cursor: Any, table: str, columns: list[str], rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    from psycopg2.extras import execute_values as psycopg_execute_values

    placeholders = ", ".join(columns)
    psycopg_execute_values(
        cursor,
        f"INSERT INTO {table} ({placeholders}) VALUES %s",
        [ordered_values(row, columns) for row in rows],
    )


def load_quality_issues(cursor: Any, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    from psycopg2.extras import Json, execute_values as psycopg_execute_values

    values = [
        (
            row.get("entity"),
            row.get("source_file"),
            row.get("source_record_index"),
            str(row.get("record_id")) if row.get("record_id") is not None else None,
            "error",
            row.get("error_code"),
            row.get("message"),
            Json(row.get("record")),
        )
        for row in rows
    ]
    psycopg_execute_values(
        cursor,
        """
        INSERT INTO data_quality_issues (
            entity, source_file, source_record_index, record_id, severity, error_code, message, payload
        ) VALUES %s
        """,
        values,
    )


def load_search_documents(cursor: Any, rows: list[dict[str, Any]], snapshot_id: int) -> None:
    if not rows:
        return
    from psycopg2.extras import Json, execute_values as psycopg_execute_values

    values = [
        (
            row.get("id"),
            row.get("entity_type"),
            row.get("entity_id"),
            row.get("title"),
            row.get("content"),
            Json(row.get("metadata") or {}),
            snapshot_id,
        )
        for row in rows
    ]
    psycopg_execute_values(
        cursor,
        """
        INSERT INTO search_documents (
            id, entity_type, entity_id, title, content, metadata, source_snapshot_id
        ) VALUES %s
        """,
        values,
    )


def load_database(database_url: str, processed_dir: Path, validation_dir: Path, allow_findings: bool) -> dict[str, int]:
    import psycopg2

    validation_summary = read_json(validation_dir / "summary.json")
    if validation_summary.get("error_count", 0) and not allow_findings:
        raise RuntimeError("Validation has findings. Rerun with --allow-findings to load visible quality issues.")

    items = read_jsonl(processed_dir / "items.jsonl")
    maps = read_jsonl(processed_dir / "maps.jsonl")
    monsters = read_jsonl(processed_dir / "monsters.jsonl")
    npcs = read_jsonl(processed_dir / "npcs.jsonl")
    quests = read_jsonl(processed_dir / "quests.jsonl")
    objectives = sanitize_quest_objectives(
        read_jsonl(processed_dir / "quest_objectives.jsonl"),
        {row["id"] for row in items if isinstance(row.get("id"), int)},
    )
    search_documents = build_search_documents(items, maps, monsters, quests, objectives)
    quality_issues = read_jsonl(validation_dir / "dead_letter.jsonl")

    trace = items[0] if items else {}
    with psycopg2.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                TRUNCATE
                    data_quality_issues,
                    search_documents,
                    quest_objectives,
                    quests,
                    npcs,
                    monsters,
                    items,
                    maps,
                    source_snapshots
                RESTART IDENTITY CASCADE
                """
            )
            cursor.execute(
                """
                INSERT INTO source_snapshots (source, base_url, captured_at, verified_status, patch_version)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    trace.get("source") or "unknown",
                    trace.get("base_url"),
                    trace.get("captured_at"),
                    trace.get("verified_status") or "raw_validated_with_findings",
                    trace.get("patch_version"),
                ),
            )
            snapshot_id = cursor.fetchone()[0]

            execute_values(cursor, "maps", ["id", "name", "source_snapshot_id"], attach_snapshot_id(maps, snapshot_id))
            execute_values(
                cursor,
                "items",
                [
                    "id",
                    "name",
                    "type_id",
                    "type_label",
                    "sell",
                    "process",
                    "process_amount",
                    "badge",
                    "note",
                    "source_snapshot_id",
                ],
                attach_snapshot_id(items, snapshot_id),
            )
            execute_values(
                cursor,
                "monsters",
                [
                    "id",
                    "name",
                    "level",
                    "map_id",
                    "map_name",
                    "type_code",
                    "type_label",
                    "mode",
                    "hp",
                    "exp",
                    "element_id",
                    "element_label",
                    "tameable",
                    "limited",
                    "badge",
                    "note",
                    "source_snapshot_id",
                ],
                attach_snapshot_id(monsters, snapshot_id),
            )
            execute_values(cursor, "npcs", ["id", "name", "source_snapshot_id"], attach_snapshot_id(npcs, snapshot_id))
            execute_values(
                cursor,
                "quests",
                [
                    "id",
                    "title",
                    "type",
                    "level_required",
                    "exp_reward",
                    "npc_id",
                    "npc_name",
                    "source_snapshot_id",
                ],
                attach_snapshot_id(quests, snapshot_id),
            )
            execute_values(
                cursor,
                "quest_objectives",
                [
                    "id",
                    "quest_id",
                    "objective_index",
                    "text",
                    "target_item_id",
                    "target_item_name",
                    "source_snapshot_id",
                ],
                attach_snapshot_id(objectives, snapshot_id),
            )
            load_quality_issues(cursor, quality_issues)
            load_search_documents(cursor, search_documents, snapshot_id)

    return {
        "items": len(items),
        "maps": len(maps),
        "monsters": len(monsters),
        "npcs": len(npcs),
        "quests": len(quests),
        "quest_objectives": len(objectives),
        "search_documents": len(search_documents),
        "data_quality_issues": len(quality_issues),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load validated processed Toram data into PostgreSQL.")
    parser.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    parser.add_argument("--processed-dir", default=PROCESSED_DIR, type=Path)
    parser.add_argument("--validation-dir", default=VALIDATION_DIR, type=Path)
    parser.add_argument("--raw-dir", default=ROOT / "data" / "raw", type=Path)
    parser.add_argument("--allow-findings", action="store_true")
    parser.add_argument("--skip-etl", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.database_url:
        raise RuntimeError("DATABASE_URL is required.")
    if not args.skip_etl:
        etl = load_etl_module()
        etl.run(args.raw_dir, args.processed_dir, args.allow_findings)
    counts = load_database(args.database_url, args.processed_dir, args.validation_dir, args.allow_findings)
    print("PostgreSQL load complete.")
    for key, value in counts.items():
        print(f"{key}: {value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
