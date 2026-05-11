from __future__ import annotations

from collections import defaultdict
from typing import Any

from backend.repositories import LedgerRepository


VALID_GOALS = {"balanced", "exp", "item_collection"}


def side_quest_recommendations(
    repository: LedgerRepository,
    *,
    player_level: int,
    goal: str = "balanced",
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Rank side quests by practical usefulness for a player's current level."""
    normalized_goal = goal.casefold()
    if normalized_goal not in VALID_GOALS:
        normalized_goal = "balanced"

    objectives_by_quest: dict[Any, list[dict[str, Any]]] = defaultdict(list)
    for objective in repository.dataset("quest_objectives"):
        objectives_by_quest[objective.get("quest_id")].append(objective)

    recommendations: list[dict[str, Any]] = []
    for quest in repository.dataset("quests"):
        level_required = quest.get("level_required")
        exp_reward = quest.get("exp_reward")
        if not isinstance(level_required, int) or not isinstance(exp_reward, int):
            continue
        if level_required > player_level:
            continue

        objectives = sorted(objectives_by_quest.get(quest.get("id"), []), key=lambda row: row.get("objective_index") or 0)
        objective_count = max(1, len(objectives))
        exp_per_objective = round(exp_reward / objective_count)
        level_gap = max(0, player_level - level_required)
        required_items = [
            {
                "item_id": objective.get("target_item_id"),
                "item_name": objective.get("target_item_name"),
                "objective": objective.get("text"),
            }
            for objective in objectives
            if objective.get("target_item_id") is not None or objective.get("target_item_name")
        ]
        item_signal = len(required_items)
        score = _score_quest(
            exp_reward=exp_reward,
            exp_per_objective=exp_per_objective,
            level_gap=level_gap,
            objective_count=objective_count,
            item_signal=item_signal,
            goal=normalized_goal,
        )

        recommendations.append(
            {
                "id": quest.get("id"),
                "title": quest.get("title"),
                "type": quest.get("type"),
                "level_required": level_required,
                "level_gap": level_gap,
                "exp_reward": exp_reward,
                "exp_per_objective": exp_per_objective,
                "objective_count": len(objectives),
                "npc_id": quest.get("npc_id"),
                "npc_name": quest.get("npc_name"),
                "required_items": required_items,
                "score": round(score, 2),
                "reason": _recommendation_reason(normalized_goal, exp_reward, exp_per_objective, level_gap, item_signal),
            }
        )

    return sorted(
        recommendations,
        key=lambda row: (-row["score"], row["level_gap"], -(row["exp_reward"] or 0), str(row["title"] or "")),
    )[: max(1, limit)]


def _score_quest(
    *,
    exp_reward: int,
    exp_per_objective: int,
    level_gap: int,
    objective_count: int,
    item_signal: int,
    goal: str,
) -> float:
    level_penalty = min(level_gap, 80) * 0.8
    objective_penalty = max(0, objective_count - 1) * 250
    if goal == "exp":
        return exp_reward * 0.65 + exp_per_objective * 0.35 - level_penalty - objective_penalty
    if goal == "item_collection":
        return item_signal * 3500 + exp_per_objective * 0.25 + exp_reward * 0.1 - level_penalty
    return exp_reward * 0.45 + exp_per_objective * 0.45 + item_signal * 900 - level_penalty - objective_penalty


def _recommendation_reason(goal: str, exp_reward: int, exp_per_objective: int, level_gap: int, item_signal: int) -> str:
    if goal == "exp":
        return f"Strong EXP candidate: {exp_reward:,} total EXP and {exp_per_objective:,} EXP per objective."
    if goal == "item_collection":
        return f"Good material-planning candidate: {item_signal} linked item objective(s) and visible NPC handoff."
    if level_gap <= 10:
        return f"Close to your level with {exp_per_objective:,} EXP per objective."
    return f"Available now, but {level_gap} levels below you; use it if objectives are convenient."
