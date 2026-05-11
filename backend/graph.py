from __future__ import annotations

from typing import Any

import networkx as nx


def node_id(kind: str, value: Any) -> str:
    return f"{kind}:{value}"


def build_ledger_graph(repository: Any) -> nx.DiGraph:
    graph = nx.DiGraph()

    for row in repository.dataset("maps"):
        graph.add_node(node_id("map", row.get("id")), kind="map", **compact_node(row, ["id", "name"]))

    for row in repository.dataset("monsters"):
        monster_node = node_id("monster", row.get("id"))
        graph.add_node(
            monster_node,
            kind="monster",
            **compact_node(row, ["id", "name", "level", "map_id", "map_name", "exp", "element_label", "type_label"]),
        )
        if row.get("map_id") is not None:
            graph.add_edge(node_id("map", row.get("map_id")), monster_node, relation="hosts")

    for row in repository.dataset("items"):
        graph.add_node(node_id("item", row.get("id")), kind="item", **compact_node(row, ["id", "name", "type_label", "sell"]))

    for row in repository.dataset("quests"):
        quest_node = node_id("quest", row.get("id"))
        graph.add_node(
            quest_node,
            kind="quest",
            **compact_node(row, ["id", "title", "type", "level_required", "exp_reward", "npc_name"]),
        )

    for row in repository.dataset("quest_objectives"):
        objective_node = node_id("objective", row.get("id"))
        graph.add_node(
            objective_node,
            kind="objective",
            **compact_node(row, ["id", "quest_id", "objective_index", "text", "target_item_id", "target_item_name"]),
        )
        if row.get("quest_id") is not None:
            graph.add_edge(node_id("quest", row.get("quest_id")), objective_node, relation="has_objective")
        if row.get("target_item_id") is not None:
            graph.add_edge(objective_node, node_id("item", row.get("target_item_id")), relation="targets_item")

    return graph


def compact_node(row: dict[str, Any], keys: list[str]) -> dict[str, Any]:
    return {key: row.get(key) for key in keys}


def graph_summary(graph: nx.DiGraph) -> dict[str, Any]:
    nodes_by_kind: dict[str, int] = {}
    edges_by_relation: dict[str, int] = {}
    for _, attributes in graph.nodes(data=True):
        kind = str(attributes.get("kind", "unknown"))
        nodes_by_kind[kind] = nodes_by_kind.get(kind, 0) + 1
    for _, _, attributes in graph.edges(data=True):
        relation = str(attributes.get("relation", "unknown"))
        edges_by_relation[relation] = edges_by_relation.get(relation, 0) + 1
    return {
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "nodes_by_kind": dict(sorted(nodes_by_kind.items())),
        "edges_by_relation": dict(sorted(edges_by_relation.items())),
    }


def item_quest_paths(graph: nx.DiGraph, item_id: int, limit: int = 10) -> list[dict[str, Any]]:
    item_node = node_id("item", item_id)
    if item_node not in graph:
        return []

    undirected = graph.to_undirected()
    results: list[dict[str, Any]] = []
    for node, attributes in graph.nodes(data=True):
        if attributes.get("kind") != "quest":
            continue
        try:
            path = nx.shortest_path(undirected, item_node, node)
        except nx.NetworkXNoPath:
            continue
        if len(path) > 4:
            continue
        results.append(
            {
                "quest": graph.nodes[node],
                "distance": len(path) - 1,
                "path": [graph.nodes[path_node] | {"node": path_node} for path_node in path],
            }
        )

    return sorted(
        results,
        key=lambda row: (
            row["distance"],
            -(row["quest"].get("exp_reward") or 0),
            row["quest"].get("title") or "",
        ),
    )[:limit]


def quest_recommendations(repository: Any, player_level: int, limit: int = 10) -> list[dict[str, Any]]:
    quests = []
    objectives_by_quest: dict[int, int] = {}
    for objective in repository.dataset("quest_objectives"):
        quest_id = objective.get("quest_id")
        if isinstance(quest_id, int):
            objectives_by_quest[quest_id] = objectives_by_quest.get(quest_id, 0) + 1

    for quest in repository.dataset("quests"):
        level_required = quest.get("level_required")
        exp_reward = quest.get("exp_reward")
        if not isinstance(level_required, int) or not isinstance(exp_reward, int):
            continue
        if level_required > player_level:
            continue
        objective_count = max(1, objectives_by_quest.get(quest["id"], 1))
        quests.append(
            {
                **quest,
                "objective_count": objective_count,
                "exp_per_objective": round(exp_reward / objective_count, 2),
                "level_gap": player_level - level_required,
            }
        )

    return sorted(
        quests,
        key=lambda quest: (
            quest["exp_per_objective"],
            quest.get("exp_reward") or 0,
            -quest["level_gap"],
        ),
        reverse=True,
    )[:limit]


def leveling_recommendations(repository: Any, player_level: int, window: int = 10, limit: int = 10) -> list[dict[str, Any]]:
    lower = max(1, player_level - window)
    upper = player_level + window
    candidates = [
        monster
        for monster in repository.dataset("monsters")
        if isinstance(monster.get("level"), int) and lower <= monster["level"] <= upper
    ]
    map_groups: dict[str, dict[str, Any]] = {}
    for monster in candidates:
        map_key = str(monster.get("map_id") or "unknown")
        group = map_groups.setdefault(
            map_key,
            {
                "map_id": monster.get("map_id"),
                "map_name": monster.get("map_name") or "Unknown map",
                "monster_count": 0,
                "total_exp": 0,
                "monsters": [],
            },
        )
        group["monster_count"] += 1
        if isinstance(monster.get("exp"), int):
            group["total_exp"] += monster["exp"]
        group["monsters"].append(monster)

    for group in map_groups.values():
        group["average_exp"] = round(group["total_exp"] / max(1, group["monster_count"]), 2)
        group["monsters"] = sorted(
            group["monsters"],
            key=lambda monster: (monster.get("exp") or 0, monster.get("level") or 0),
            reverse=True,
        )[:5]

    return sorted(
        map_groups.values(),
        key=lambda group: (group["average_exp"], group["monster_count"]),
        reverse=True,
    )[:limit]
