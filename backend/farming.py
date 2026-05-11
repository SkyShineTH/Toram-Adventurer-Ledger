from __future__ import annotations

from collections import defaultdict
from typing import Any

from backend.repositories import LedgerRepository


VALID_FARMING_GOALS = {"npc_sell", "quest_material", "balanced"}


def farming_plan(
    repository: LedgerRepository,
    *,
    goal: str = "balanced",
    player_level: int | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    normalized_goal = goal.casefold()
    if normalized_goal not in VALID_FARMING_GOALS:
        normalized_goal = "balanced"

    items_by_id = {row.get("id"): row for row in repository.dataset("items") if isinstance(row.get("id"), int)}
    quest_usage = quest_material_usage(repository)
    candidates: list[dict[str, Any]] = []

    for item_id, item in items_by_id.items():
        sell = item.get("sell")
        usage = quest_usage.get(item_id, [])
        if normalized_goal == "npc_sell" and not isinstance(sell, int):
            continue
        if normalized_goal == "quest_material" and not usage:
            continue
        if normalized_goal == "balanced" and not usage and not isinstance(sell, int):
            continue

        score = score_farming_candidate(sell=sell, quest_usage_count=len(usage), goal=normalized_goal)
        candidates.append(
            {
                "item_id": item_id,
                "item_name": item.get("name"),
                "type_label": item.get("type_label"),
                "sell": sell,
                "quest_usage_count": len(usage),
                "quest_usages": usage[:5],
                "score": round(score, 2),
                "reason": farming_reason(normalized_goal, sell, len(usage)),
            }
        )

    ranked = sorted(
        candidates,
        key=lambda row: (-row["score"], -(row["sell"] or 0), -row["quest_usage_count"], str(row["item_name"] or "")),
    )[: max(1, limit)]
    return {
        "goal": normalized_goal,
        "player_level": player_level,
        "items": ranked,
        "limitations": [
            "Drop locations are not ranked yet because the current validated schema does not include Monster -> Drop -> Item rows.",
            "Use this as a target list for NPC value or quest material prep, then confirm farming location manually until drop data is loaded.",
        ],
    }


def quest_material_usage(repository: LedgerRepository) -> dict[int, list[dict[str, Any]]]:
    quests_by_id = {row.get("id"): row for row in repository.dataset("quests")}
    usage: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for objective in repository.dataset("quest_objectives"):
        item_id = objective.get("target_item_id")
        if not isinstance(item_id, int):
            continue
        quest = quests_by_id.get(objective.get("quest_id"), {})
        usage[item_id].append(
            {
                "quest_id": objective.get("quest_id"),
                "quest_title": quest.get("title"),
                "npc_name": quest.get("npc_name"),
                "level_required": quest.get("level_required"),
                "exp_reward": quest.get("exp_reward"),
                "objective": objective.get("text"),
            }
        )
    return usage


def score_farming_candidate(*, sell: Any, quest_usage_count: int, goal: str) -> float:
    sell_score = float(sell) if isinstance(sell, int) else 0.0
    quest_score = float(quest_usage_count * 500)
    if goal == "npc_sell":
        return sell_score + quest_score * 0.15
    if goal == "quest_material":
        return quest_score + sell_score * 0.1
    return sell_score * 0.55 + quest_score * 0.65


def farming_reason(goal: str, sell: Any, quest_usage_count: int) -> str:
    sell_label = f"{sell:,} NPC sell" if isinstance(sell, int) else "no NPC sell value"
    if goal == "npc_sell":
        return f"Prioritized for direct NPC value: {sell_label}."
    if goal == "quest_material":
        return f"Used by {quest_usage_count} quest objective(s); good prep target before accepting quests."
    return f"Balanced target with {sell_label} and {quest_usage_count} linked quest objective(s)."
