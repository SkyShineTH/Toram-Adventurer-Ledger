import unittest

from backend.side_quests import side_quest_recommendations


class FakeRepository:
    rows = {
        "quests": [
            {
                "id": 1,
                "title": "Efficient Errand",
                "type": "Side Quest",
                "level_required": 40,
                "exp_reward": 10000,
                "npc_id": 10,
                "npc_name": "Lefina",
            },
            {
                "id": 2,
                "title": "Too High",
                "type": "Side Quest",
                "level_required": 90,
                "exp_reward": 50000,
                "npc_id": 11,
                "npc_name": "Guard",
            },
            {
                "id": 3,
                "title": "Material Run",
                "type": "Side Quest",
                "level_required": 35,
                "exp_reward": 4000,
                "npc_id": 12,
                "npc_name": "Crafter",
            },
        ],
        "quest_objectives": [
            {
                "id": "1:0",
                "quest_id": 1,
                "objective_index": 0,
                "text": "Defeat monsters",
                "target_item_id": None,
                "target_item_name": None,
            },
            {
                "id": "3:0",
                "quest_id": 3,
                "objective_index": 0,
                "text": "Collect shells",
                "target_item_id": 100,
                "target_item_name": "Shell",
            },
        ],
    }

    def dataset(self, name: str):
        return self.rows[name]


class SideQuestRecommendationTests(unittest.TestCase):
    def test_filters_quests_above_player_level(self) -> None:
        recommendations = side_quest_recommendations(FakeRepository(), player_level=50, goal="exp")

        self.assertEqual(recommendations[0]["title"], "Efficient Errand")
        self.assertNotIn("Too High", {row["title"] for row in recommendations})

    def test_item_collection_goal_surfaces_item_objectives(self) -> None:
        recommendations = side_quest_recommendations(FakeRepository(), player_level=50, goal="item_collection")

        self.assertEqual(recommendations[0]["title"], "Material Run")
        self.assertEqual(recommendations[0]["required_items"][0]["item_name"], "Shell")
        self.assertIn("material-planning", recommendations[0]["reason"])

    def test_unknown_goal_falls_back_to_balanced(self) -> None:
        recommendations = side_quest_recommendations(FakeRepository(), player_level=50, goal="unknown")

        self.assertGreater(recommendations[0]["score"], 0)


if __name__ == "__main__":
    unittest.main()
