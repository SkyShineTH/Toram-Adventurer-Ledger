from __future__ import annotations

from typing import Any

from backend.repositories import LedgerRepository


def data_coverage(repository: LedgerRepository) -> dict[str, Any]:
    loaded = {
        "items": len(repository.dataset("items")),
        "maps": len(repository.dataset("maps")),
        "monsters": len(repository.dataset("monsters")),
        "quests": len(repository.dataset("quests")),
        "quest_objectives": len(repository.dataset("quest_objectives")),
    }
    relationships = [
        {
            "name": "maps -> monsters",
            "status": "available" if loaded["maps"] and loaded["monsters"] else "missing",
            "note": "Map references are loaded from monster records.",
        },
        {
            "name": "quests -> objectives -> items",
            "status": "available" if loaded["quests"] and loaded["quest_objectives"] and loaded["items"] else "missing",
            "note": "Quest item objectives support side quest and material planning.",
        },
        {
            "name": "monsters -> drops -> items",
            "status": "not_available",
            "note": "No validated drop source is currently part of the raw contract.",
        },
        {
            "name": "items -> crafting recipes",
            "status": "not_available",
            "note": "No validated crafting recipe source is currently part of the raw contract.",
        },
    ]
    return {
        "loaded": loaded,
        "relationships": relationships,
        "next_normalization_targets": [
            "Add raw drop/craft source files to the validation contract.",
            "Validate required IDs, item references, monster references, quantities, and source metadata.",
            "Add normalized drops/crafting tables only after invalid rows can be isolated.",
        ],
    }
