import unittest

from backend.graph import build_ledger_graph, graph_summary, item_quest_paths, leveling_recommendations, quest_recommendations


class FakeRepository:
    rows = {
        "maps": [{"id": 1, "name": "Test Map"}],
        "monsters": [
            {"id": 10, "name": "Near Monster", "level": 50, "map_id": 1, "map_name": "Test Map", "exp": 100},
            {"id": 11, "name": "Far Monster", "level": 90, "map_id": 1, "map_name": "Test Map", "exp": 999},
        ],
        "items": [{"id": 100, "name": "Quest Item", "type_label": "[Material]", "sell": 10}],
        "quests": [{"id": 200, "title": "Useful Quest", "level_required": 45, "exp_reward": 1000, "npc_name": "NPC"}],
        "quest_objectives": [{"id": "200:0", "quest_id": 200, "objective_index": 0, "text": "Collect item", "target_item_id": 100}],
    }

    def dataset(self, name: str):
        return self.rows[name]


class GraphTests(unittest.TestCase):
    def test_build_graph_links_item_to_quest(self) -> None:
        graph = build_ledger_graph(FakeRepository())
        summary = graph_summary(graph)
        paths = item_quest_paths(graph, 100)

        self.assertEqual(summary["nodes_by_kind"]["quest"], 1)
        self.assertEqual(summary["edges_by_relation"]["targets_item"], 1)
        self.assertEqual(paths[0]["quest"]["title"], "Useful Quest")

    def test_recommendations_use_player_level(self) -> None:
        repository = FakeRepository()

        quests = quest_recommendations(repository, player_level=50)
        leveling = leveling_recommendations(repository, player_level=50, window=5)

        self.assertEqual(quests[0]["title"], "Useful Quest")
        self.assertEqual(leveling[0]["monsters"][0]["name"], "Near Monster")


if __name__ == "__main__":
    unittest.main()
