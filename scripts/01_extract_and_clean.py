from __future__ import annotations

import argparse
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR_PATH = ROOT / "scripts" / "02_validate_raw_data.py"


def load_validator():
    spec = importlib.util.spec_from_file_location("raw_validator", VALIDATOR_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load validator from {VALIDATOR_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def none_if_negative(value: Any) -> Any:
    if isinstance(value, int) and not isinstance(value, bool) and value < 0:
        return None
    return value


def normalize_meta(raw_dir: Path) -> dict[str, Any]:
    metadata_path = raw_dir / "metadata.json"
    metadata = read_json(metadata_path) if metadata_path.exists() else {}
    return {
        "source": metadata.get("source"),
        "base_url": metadata.get("base_url"),
        "captured_at": metadata.get("fetched_at"),
        "verified_status": "raw_validated_with_findings",
        "patch_version": metadata.get("fetched_at"),
    }


def normalize_items(records: list[dict[str, Any]], trace: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "id": record.get("id"),
            "name": record.get("name"),
            "type_id": record.get("type_id"),
            "type_label": record.get("type_label") or None,
            "sell": none_if_negative(record.get("sell")),
            "process": none_if_negative(record.get("process")),
            "process_amount": none_if_negative(record.get("process_amount")),
            "badge": (record.get("meta") or {}).get("badge") or None,
            "note": (record.get("meta") or {}).get("note") or None,
            **trace,
        }
        for record in records
    ]


def normalize_maps(records: list[dict[str, Any]], trace: dict[str, Any]) -> list[dict[str, Any]]:
    return [{"id": record.get("id"), "name": record.get("name"), **trace} for record in records]


def normalize_monsters(records: list[dict[str, Any]], trace: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "id": record.get("id"),
            "name": record.get("name"),
            "level": none_if_negative(record.get("level")),
            "map_id": record.get("map_id"),
            "map_name": record.get("map_name"),
            "type_code": record.get("type_code"),
            "type_label": record.get("type_label"),
            "mode": record.get("mode"),
            "hp": none_if_negative(record.get("hp")),
            "exp": none_if_negative(record.get("exp")),
            "element_id": none_if_negative(record.get("element_id")),
            "element_label": record.get("element_label"),
            "tameable": record.get("tameable"),
            "limited": record.get("limited"),
            "badge": (record.get("meta") or {}).get("badge") or None,
            "note": (record.get("meta") or {}).get("note") or None,
            **trace,
        }
        for record in records
    ]


def normalize_quests(records: list[dict[str, Any]], trace: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    quests: list[dict[str, Any]] = []
    npcs_by_id: dict[int, dict[str, Any]] = {}
    objectives: list[dict[str, Any]] = []

    for quest in records:
        npc = quest.get("npc") or {}
        npc_id = npc.get("id")
        if isinstance(npc_id, int) and not isinstance(npc_id, bool):
            npcs_by_id[npc_id] = {"id": npc_id, "name": npc.get("name"), **trace}

        quest_id = quest.get("quest_id")
        quests.append(
            {
                "id": quest_id,
                "title": quest.get("title"),
                "type": quest.get("type"),
                "level_required": none_if_negative(quest.get("lv_req")),
                "exp_reward": none_if_negative(quest.get("exp_reward")),
                "npc_id": npc_id,
                "npc_name": npc.get("name"),
                **trace,
            }
        )

        for index, objective in enumerate(quest.get("objectives") or []):
            if not isinstance(objective, dict):
                continue
            objectives.append(
                {
                    "id": f"{quest_id}:{index}",
                    "quest_id": quest_id,
                    "objective_index": index,
                    "text": objective.get("text"),
                    "target_item_id": objective.get("target_item_id"),
                    "target_item_name": objective.get("target_item_name"),
                    **trace,
                }
            )

    return quests, list(npcs_by_id.values()), objectives


def build_smart_play_summary(
    items: list[dict[str, Any]],
    maps: list[dict[str, Any]],
    monsters: list[dict[str, Any]],
    quests: list[dict[str, Any]],
    objectives: list[dict[str, Any]],
    validation_summary: dict[str, Any],
) -> dict[str, Any]:
    best_quests = sorted(
        [quest for quest in quests if isinstance(quest.get("exp_reward"), int)],
        key=lambda quest: quest["exp_reward"],
        reverse=True,
    )[:10]
    leveling_bands: dict[str, int] = {}
    for monster in monsters:
        level = monster.get("level")
        if not isinstance(level, int):
            continue
        band_start = (level // 25) * 25
        label = f"{band_start}-{band_start + 24}"
        leveling_bands[label] = leveling_bands.get(label, 0) + 1

    farm_candidates = sorted(
        [item for item in items if isinstance(item.get("sell"), int)],
        key=lambda item: item["sell"],
        reverse=True,
    )[:10]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "counts": {
            "items": len(items),
            "maps": len(maps),
            "monsters": len(monsters),
            "quests": len(quests),
            "quest_objectives": len(objectives),
        },
        "validation": {
            "passed": validation_summary.get("passed"),
            "error_count": validation_summary.get("error_count"),
            "errors_by_code": validation_summary.get("counts", {}).get("errors_by_code", {}),
            "errors_by_entity": validation_summary.get("counts", {}).get("errors_by_entity", {}),
        },
        "best_exp_quests": best_quests,
        "monster_level_bands": dict(sorted(leveling_bands.items())),
        "farm_value_candidates": farm_candidates,
    }


def run(raw_dir: Path, out_dir: Path, allow_findings: bool) -> dict[str, Any]:
    validator = load_validator()
    validation_result = validator.validate(raw_dir)
    validation_outputs = validator.write_outputs(validation_result, ROOT / "reports" / "validation")
    validation_summary = read_json(Path(validation_outputs["summary"]))

    if validation_result.errors and not allow_findings:
        raise RuntimeError("Raw validation has findings. Rerun with --allow-findings to generate processed data.")

    trace = normalize_meta(raw_dir)
    items = normalize_items(read_json(raw_dir / "items.json"), trace)
    maps = normalize_maps(read_json(raw_dir / "maps.json"), trace)
    monsters = normalize_monsters(read_json(raw_dir / "monsters.json"), trace)
    quests, npcs, objectives = normalize_quests(read_json(raw_dir / "quests_data.json"), trace)
    summary = build_smart_play_summary(items, maps, monsters, quests, objectives, validation_summary)

    write_jsonl(out_dir / "items.jsonl", items)
    write_jsonl(out_dir / "maps.jsonl", maps)
    write_jsonl(out_dir / "monsters.jsonl", monsters)
    write_jsonl(out_dir / "quests.jsonl", quests)
    write_jsonl(out_dir / "npcs.jsonl", npcs)
    write_jsonl(out_dir / "quest_objectives.jsonl", objectives)
    write_json(out_dir / "smart_play_summary.json", summary)
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize local Toram raw JSON into processed JSONL files.")
    parser.add_argument("--raw-dir", default=ROOT / "data" / "raw", type=Path)
    parser.add_argument("--out-dir", default=ROOT / "data" / "processed", type=Path)
    parser.add_argument("--allow-findings", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    summary = run(args.raw_dir, args.out_dir, args.allow_findings)
    print("Processed data generated.")
    print(f"Items: {summary['counts']['items']}")
    print(f"Maps: {summary['counts']['maps']}")
    print(f"Monsters: {summary['counts']['monsters']}")
    print(f"Quests: {summary['counts']['quests']}")
    print(f"Validation errors: {summary['validation']['error_count']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

