from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol


class LedgerRepository(Protocol):
    def smart_play_summary(self) -> dict[str, Any]:
        ...

    def validation_summary(self) -> dict[str, Any]:
        ...

    def validation_findings(self) -> list[dict[str, Any]]:
        ...

    def dataset(self, name: str) -> list[dict[str, Any]]:
        ...

    def search_documents(self, query: str, entity_type: str | None = None, limit: int = 10) -> list[dict[str, Any]]:
        ...


class MissingGeneratedFileError(FileNotFoundError):
    def __init__(self, path: Path) -> None:
        self.path = path
        super().__init__(f"Missing generated file: {path.name}")


class JsonLedgerRepository:
    def __init__(self, processed_dir: Path, validation_dir: Path) -> None:
        self.processed_dir = processed_dir
        self.validation_dir = validation_dir

    def smart_play_summary(self) -> dict[str, Any]:
        return self._read_json(self.processed_dir / "smart_play_summary.json")

    def validation_summary(self) -> dict[str, Any]:
        return self._read_json(self.validation_dir / "summary.json")

    def validation_findings(self) -> list[dict[str, Any]]:
        return self._read_jsonl(self.validation_dir / "dead_letter.jsonl")

    def dataset(self, name: str) -> list[dict[str, Any]]:
        return self._load_dataset(name)

    def search_documents(self, query: str, entity_type: str | None = None, limit: int = 10) -> list[dict[str, Any]]:
        documents = build_json_search_documents(self)
        return rank_documents(documents, query, entity_type=entity_type, limit=limit)

    @lru_cache(maxsize=16)
    def _load_dataset(self, name: str) -> list[dict[str, Any]]:
        return self._read_jsonl(self.processed_dir / f"{name}.jsonl")

    def _read_json(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            raise MissingGeneratedFileError(path)
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _read_jsonl(self, path: Path) -> list[dict[str, Any]]:
        if not path.exists():
            raise MissingGeneratedFileError(path)
        rows: list[dict[str, Any]] = []
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
        return rows


class PostgresLedgerRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def smart_play_summary(self) -> dict[str, Any]:
        items = self.dataset("items")
        maps = self.dataset("maps")
        monsters = self.dataset("monsters")
        quests = self.dataset("quests")
        objectives = self.dataset("quest_objectives")
        validation = self.validation_summary()
        best_quests = sorted(
            [quest for quest in quests if isinstance(quest.get("exp_reward"), int)],
            key=lambda quest: quest["exp_reward"],
            reverse=True,
        )[:10]
        farm_candidates = sorted(
            [item for item in items if isinstance(item.get("sell"), int)],
            key=lambda item: item["sell"],
            reverse=True,
        )[:10]
        bands: dict[str, int] = {}
        for monster in monsters:
            level = monster.get("level")
            if not isinstance(level, int):
                continue
            band_start = (level // 25) * 25
            label = f"{band_start}-{band_start + 24}"
            bands[label] = bands.get(label, 0) + 1
        return {
            "counts": {
                "items": len(items),
                "maps": len(maps),
                "monsters": len(monsters),
                "quests": len(quests),
                "quest_objectives": len(objectives),
            },
            "validation": {
                "passed": validation.get("passed"),
                "error_count": validation.get("error_count"),
                "errors_by_code": validation.get("counts", {}).get("errors_by_code", {}),
                "errors_by_entity": validation.get("counts", {}).get("errors_by_entity", {}),
            },
            "best_exp_quests": best_quests,
            "monster_level_bands": dict(sorted(bands.items())),
            "farm_value_candidates": farm_candidates,
        }

    def validation_summary(self) -> dict[str, Any]:
        records = self._table_counts(
            [
                "items",
                "maps",
                "monsters",
                "quests",
                "quest_objectives",
                "data_quality_issues",
            ]
        )
        errors_by_code = self._group_counts("data_quality_issues", "error_code")
        errors_by_entity = self._group_counts("data_quality_issues", "entity")
        error_count = records.get("data_quality_issues", 0)
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "passed": error_count == 0,
            "error_count": error_count,
            "counts": {
                "records": records,
                "errors_by_code": errors_by_code,
                "errors_by_entity": errors_by_entity,
            },
        }

    def validation_findings(self) -> list[dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT entity, source_file, source_record_index, record_id, error_code, message, payload AS record
            FROM data_quality_issues
            ORDER BY id
            """
        )

    def dataset(self, name: str) -> list[dict[str, Any]]:
        queries = {
            "items": """
                SELECT i.id, i.name, i.type_id, i.type_label, i.sell, i.process, i.process_amount,
                       i.badge, i.note, s.source, s.base_url, s.captured_at, s.verified_status, s.patch_version
                FROM items i
                LEFT JOIN source_snapshots s ON s.id = i.source_snapshot_id
                ORDER BY i.id DESC
            """,
            "maps": """
                SELECT m.id, m.name, s.source, s.base_url, s.captured_at, s.verified_status, s.patch_version
                FROM maps m
                LEFT JOIN source_snapshots s ON s.id = m.source_snapshot_id
                ORDER BY m.id DESC
            """,
            "monsters": """
                SELECT mo.id, mo.name, mo.level, mo.map_id, mo.map_name, mo.type_code, mo.type_label,
                       mo.mode, mo.hp, mo.exp, mo.element_id, mo.element_label, mo.tameable, mo.limited,
                       mo.badge, mo.note, s.source, s.base_url, s.captured_at, s.verified_status, s.patch_version
                FROM monsters mo
                LEFT JOIN source_snapshots s ON s.id = mo.source_snapshot_id
                ORDER BY mo.id DESC
            """,
            "npcs": """
                SELECT n.id, n.name, s.source, s.base_url, s.captured_at, s.verified_status, s.patch_version
                FROM npcs n
                LEFT JOIN source_snapshots s ON s.id = n.source_snapshot_id
                ORDER BY n.id DESC
            """,
            "quests": """
                SELECT q.id, q.title, q.type, q.level_required, q.exp_reward, q.npc_id, q.npc_name,
                       s.source, s.base_url, s.captured_at, s.verified_status, s.patch_version
                FROM quests q
                LEFT JOIN source_snapshots s ON s.id = q.source_snapshot_id
                ORDER BY q.id DESC
            """,
            "quest_objectives": """
                SELECT qo.id, qo.quest_id, qo.objective_index, qo.text, qo.target_item_id, qo.target_item_name,
                       s.source, s.base_url, s.captured_at, s.verified_status, s.patch_version
                FROM quest_objectives qo
                LEFT JOIN source_snapshots s ON s.id = qo.source_snapshot_id
                ORDER BY qo.quest_id DESC, qo.objective_index
            """,
        }
        if name not in queries:
            raise KeyError(f"Unknown dataset: {name}")
        return self._fetch_all(queries[name])

    def search_documents(self, query: str, entity_type: str | None = None, limit: int = 10) -> list[dict[str, Any]]:
        parameters: list[Any] = [query, query]
        entity_filter = ""
        if entity_type:
            entity_filter = "AND entity_type = %s"
            parameters.append(entity_type)
        parameters.append(limit)
        return self._fetch_all(
            f"""
            SELECT id, entity_type, entity_id, title, content, metadata,
                   ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', %s)) AS score
            FROM search_documents
            WHERE to_tsvector('english', content) @@ plainto_tsquery('english', %s)
            {entity_filter}
            ORDER BY score DESC, title ASC
            LIMIT %s
            """,
            parameters=parameters,
        )

    def _connect(self) -> Any:
        import psycopg2
        import psycopg2.extras

        return psycopg2.connect(self.database_url, cursor_factory=psycopg2.extras.RealDictCursor)

    def _fetch_all(self, query: str, parameters: list[Any] | None = None) -> list[dict[str, Any]]:
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, parameters)
                return [dict(row) for row in cursor.fetchall()]

    def _table_counts(self, tables: list[str]) -> dict[str, int]:
        counts: dict[str, int] = {}
        with self._connect() as connection:
            with connection.cursor() as cursor:
                for table in tables:
                    cursor.execute(f"SELECT COUNT(*) AS count FROM {table}")
                    counts[table] = int(cursor.fetchone()["count"])
        return counts

    def _group_counts(self, table: str, column: str) -> dict[str, int]:
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT {column} AS label, COUNT(*) AS count FROM {table} GROUP BY {column}")
                return {str(row["label"]): int(row["count"]) for row in cursor.fetchall()}


def create_repository(processed_dir: Path, validation_dir: Path) -> LedgerRepository:
    repository_kind = os.environ.get("LEDGER_REPOSITORY", "json").casefold()
    if repository_kind == "postgres":
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            raise RuntimeError("DATABASE_URL is required when LEDGER_REPOSITORY=postgres.")
        return PostgresLedgerRepository(database_url)
    if repository_kind != "json":
        raise RuntimeError(f"Unsupported LEDGER_REPOSITORY value: {repository_kind}")
    return JsonLedgerRepository(processed_dir, validation_dir)


def build_json_search_documents(repository: JsonLedgerRepository) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []
    for item in repository.dataset("items"):
        documents.append(
            {
                "id": f"item:{item.get('id')}",
                "entity_type": "item",
                "entity_id": str(item.get("id")),
                "title": item.get("name") or f"Item {item.get('id')}",
                "content": " ".join(str(part) for part in [item.get("name"), item.get("type_label"), item.get("note")] if part),
                "metadata": {"type_label": item.get("type_label"), "sell": item.get("sell")},
            }
        )
    for game_map in repository.dataset("maps"):
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
    for monster in repository.dataset("monsters"):
        documents.append(
            {
                "id": f"monster:{monster.get('id')}",
                "entity_type": "monster",
                "entity_id": str(monster.get("id")),
                "title": monster.get("name") or f"Monster {monster.get('id')}",
                "content": " ".join(
                    str(part)
                    for part in [
                        monster.get("name"),
                        monster.get("map_name"),
                        monster.get("type_label"),
                        monster.get("element_label"),
                        monster.get("level"),
                    ]
                    if part
                ),
                "metadata": {
                    "level": monster.get("level"),
                    "map_name": monster.get("map_name"),
                    "element_label": monster.get("element_label"),
                },
            }
        )
    objectives_by_quest: dict[Any, list[dict[str, Any]]] = {}
    for objective in repository.dataset("quest_objectives"):
        objectives_by_quest.setdefault(objective.get("quest_id"), []).append(objective)
    for quest in repository.dataset("quests"):
        objective_text = " ".join(str(objective.get("text") or "") for objective in objectives_by_quest.get(quest.get("id"), []))
        documents.append(
            {
                "id": f"quest:{quest.get('id')}",
                "entity_type": "quest",
                "entity_id": str(quest.get("id")),
                "title": quest.get("title") or f"Quest {quest.get('id')}",
                "content": " ".join(
                    str(part)
                    for part in [quest.get("title"), quest.get("type"), quest.get("npc_name"), quest.get("exp_reward"), objective_text]
                    if part
                ),
                "metadata": {
                    "type": quest.get("type"),
                    "level_required": quest.get("level_required"),
                    "exp_reward": quest.get("exp_reward"),
                    "npc_name": quest.get("npc_name"),
                },
            }
        )
    return documents


def rank_documents(
    documents: list[dict[str, Any]],
    query: str,
    entity_type: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    terms = [term.casefold() for term in query.split() if term.strip()]
    if not terms:
        return []
    ranked: list[dict[str, Any]] = []
    for document in documents:
        if entity_type and document.get("entity_type") != entity_type:
            continue
        haystack = f"{document.get('title', '')} {document.get('content', '')}".casefold()
        score = sum(haystack.count(term) for term in terms)
        if score <= 0:
            continue
        ranked.append({**document, "score": float(score)})
    return sorted(ranked, key=lambda row: (-row["score"], row["title"]))[:limit]
