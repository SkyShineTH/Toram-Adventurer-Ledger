from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.repositories import LedgerRepository, MissingGeneratedFileError, create_repository


ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "data" / "processed"
VALIDATION_DIR = ROOT / "reports" / "validation"
repository: LedgerRepository = create_repository(PROCESSED_DIR, VALIDATION_DIR)

app = FastAPI(title="Toram Adventurer Ledger API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(MissingGeneratedFileError)
def missing_generated_file_handler(_request: Any, exc: MissingGeneratedFileError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": f"Missing generated file: {exc.path.name}"})


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
        filtered = [row for row in rows if needle in json.dumps(row, ensure_ascii=False, default=str).casefold()]
    total = len(filtered)
    return {"total": total, "limit": limit, "offset": offset, "items": filtered[offset : offset + limit]}


def text_matches(value: Any, expected: str | None) -> bool:
    if not expected:
        return True
    if value is None:
        return False
    return expected.casefold() in str(value).casefold()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "repository": type(repository).__name__,
        "processed_data_ready": (PROCESSED_DIR / "smart_play_summary.json").exists(),
        "validation_ready": (VALIDATION_DIR / "summary.json").exists(),
    }


@app.get("/validation/summary")
def validation_summary() -> dict[str, Any]:
    return repository.validation_summary()


@app.get("/validation/findings")
def validation_findings(limit: int = 50, offset: int = 0) -> dict[str, Any]:
    rows = repository.validation_findings()
    total = len(rows)
    return {"total": total, "limit": limit, "offset": offset, "items": rows[offset : offset + limit]}


@app.get("/dashboard/smart-play")
def smart_play_dashboard() -> dict[str, Any]:
    return repository.smart_play_summary()


@app.get("/items")
def items(
    q: str | None = None,
    type_label: str | None = None,
    min_sell: int | None = None,
    max_sell: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    rows = repository.dataset("items")
    if type_label:
        rows = [row for row in rows if text_matches(row.get("type_label"), type_label)]
    if min_sell is not None:
        rows = [row for row in rows if isinstance(row.get("sell"), int) and row["sell"] >= min_sell]
    if max_sell is not None:
        rows = [row for row in rows if isinstance(row.get("sell"), int) and row["sell"] <= max_sell]
    return filter_rows(rows, query=q, limit=limit, offset=offset)


@app.get("/items/{item_id}")
def item_detail(item_id: int) -> dict[str, Any]:
    for item in repository.dataset("items"):
        if item.get("id") == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")


@app.get("/maps")
def maps(q: str | None = None, limit: int = 50, offset: int = 0) -> dict[str, Any]:
    return filter_rows(repository.dataset("maps"), query=q, limit=limit, offset=offset)


@app.get("/monsters")
def monsters(
    q: str | None = None,
    type_label: str | None = None,
    element_label: str | None = None,
    min_level: int | None = None,
    max_level: int | None = None,
    map_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    rows = repository.dataset("monsters")
    if type_label:
        rows = [row for row in rows if text_matches(row.get("type_label"), type_label)]
    if element_label:
        rows = [row for row in rows if text_matches(row.get("element_label"), element_label)]
    if min_level is not None:
        rows = [row for row in rows if isinstance(row.get("level"), int) and row["level"] >= min_level]
    if max_level is not None:
        rows = [row for row in rows if isinstance(row.get("level"), int) and row["level"] <= max_level]
    if map_id is not None:
        rows = [row for row in rows if row.get("map_id") == map_id]
    return filter_rows(rows, query=q, limit=limit, offset=offset)


@app.get("/quests")
def quests(
    q: str | None = None,
    quest_type: str | None = None,
    npc_name: str | None = None,
    min_level: int | None = None,
    max_level: int | None = None,
    min_exp: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    rows = repository.dataset("quests")
    if quest_type:
        rows = [row for row in rows if text_matches(row.get("type"), quest_type)]
    if npc_name:
        rows = [row for row in rows if text_matches(row.get("npc_name"), npc_name)]
    if min_level is not None:
        rows = [row for row in rows if isinstance(row.get("level_required"), int) and row["level_required"] >= min_level]
    if max_level is not None:
        rows = [row for row in rows if isinstance(row.get("level_required"), int) and row["level_required"] <= max_level]
    if min_exp is not None:
        rows = [row for row in rows if isinstance(row.get("exp_reward"), int) and row["exp_reward"] >= min_exp]
    return filter_rows(rows, query=q, limit=limit, offset=offset)


@app.get("/relationships/item/{item_id}/quests")
def quests_for_item(item_id: int) -> dict[str, Any]:
    objective_rows = [row for row in repository.dataset("quest_objectives") if row.get("target_item_id") == item_id]
    quest_ids = {row.get("quest_id") for row in objective_rows}
    quest_rows = [row for row in repository.dataset("quests") if row.get("id") in quest_ids]
    return {"item_id": item_id, "objectives": objective_rows, "quests": quest_rows}
