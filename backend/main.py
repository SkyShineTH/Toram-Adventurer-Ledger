from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "data" / "processed"
VALIDATION_DIR = ROOT / "reports" / "validation"

app = FastAPI(title="Toram Adventurer Ledger API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def read_json(path: Path) -> Any:
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Missing generated file: {path.name}")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Missing generated file: {path.name}")
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


@lru_cache(maxsize=16)
def load_dataset(name: str) -> list[dict[str, Any]]:
    return read_jsonl(PROCESSED_DIR / f"{name}.jsonl")


def filter_rows(
    rows: list[dict[str, Any]],
    *,
    query: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    filtered = rows
    if query:
        needle = query.casefold()
        filtered = [row for row in rows if needle in json.dumps(row, ensure_ascii=False).casefold()]
    total = len(filtered)
    return {"total": total, "limit": limit, "offset": offset, "items": filtered[offset : offset + limit]}


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "processed_data_ready": (PROCESSED_DIR / "smart_play_summary.json").exists(),
        "validation_ready": (VALIDATION_DIR / "summary.json").exists(),
    }


@app.get("/validation/summary")
def validation_summary() -> dict[str, Any]:
    return read_json(VALIDATION_DIR / "summary.json")


@app.get("/dashboard/smart-play")
def smart_play_dashboard() -> dict[str, Any]:
    return read_json(PROCESSED_DIR / "smart_play_summary.json")


@app.get("/items")
def items(q: str | None = None, limit: int = 50, offset: int = 0) -> dict[str, Any]:
    return filter_rows(load_dataset("items"), query=q, limit=limit, offset=offset)


@app.get("/items/{item_id}")
def item_detail(item_id: int) -> dict[str, Any]:
    for item in load_dataset("items"):
        if item.get("id") == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")


@app.get("/maps")
def maps(q: str | None = None, limit: int = 50, offset: int = 0) -> dict[str, Any]:
    return filter_rows(load_dataset("maps"), query=q, limit=limit, offset=offset)


@app.get("/monsters")
def monsters(
    q: str | None = None,
    min_level: int | None = None,
    max_level: int | None = None,
    map_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    rows = load_dataset("monsters")
    if min_level is not None:
        rows = [row for row in rows if isinstance(row.get("level"), int) and row["level"] >= min_level]
    if max_level is not None:
        rows = [row for row in rows if isinstance(row.get("level"), int) and row["level"] <= max_level]
    if map_id is not None:
        rows = [row for row in rows if row.get("map_id") == map_id]
    return filter_rows(rows, query=q, limit=limit, offset=offset)


@app.get("/quests")
def quests(q: str | None = None, limit: int = 50, offset: int = 0) -> dict[str, Any]:
    return filter_rows(load_dataset("quests"), query=q, limit=limit, offset=offset)


@app.get("/relationships/item/{item_id}/quests")
def quests_for_item(item_id: int) -> dict[str, Any]:
    objective_rows = [row for row in load_dataset("quest_objectives") if row.get("target_item_id") == item_id]
    quest_ids = {row.get("quest_id") for row in objective_rows}
    quest_rows = [row for row in load_dataset("quests") if row.get("id") in quest_ids]
    return {"item_id": item_id, "objectives": objective_rows, "quests": quest_rows}
