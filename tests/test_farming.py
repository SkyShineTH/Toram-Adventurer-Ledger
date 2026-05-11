import unittest

from backend.farming import farming_plan


class FakeRepository:
    rows = {
        "items": [
            {"id": 1, "name": "Vendor Gem", "type_label": "[Material]", "sell": 900},
            {"id": 2, "name": "Quest Shell", "type_label": "[Material]", "sell": 10},
            {"id": 3, "name": "Flavor Text", "type_label": "[Special]", "sell": None},
        ],
        "quests": [
            {"id": 10, "title": "Shell Run", "npc_name": "Lefina", "level_required": 20, "exp_reward": 1000},
        ],
        "quest_objectives": [
            {
                "id": "10:0",
                "quest_id": 10,
                "text": "Collect Quest Shell",
                "target_item_id": 2,
                "target_item_name": "Quest Shell",
            }
        ],
    }

    def dataset(self, name: str):
        return self.rows[name]


class FarmingPlanTests(unittest.TestCase):
    def test_npc_sell_goal_prioritizes_sell_value(self) -> None:
        plan = farming_plan(FakeRepository(), goal="npc_sell", limit=2)

        self.assertEqual(plan["items"][0]["item_name"], "Vendor Gem")
        self.assertIn("Drop locations are not ranked yet", plan["limitations"][0])

    def test_quest_material_goal_requires_quest_usage(self) -> None:
        plan = farming_plan(FakeRepository(), goal="quest_material")

        self.assertEqual(plan["items"][0]["item_name"], "Quest Shell")
        self.assertEqual(plan["items"][0]["quest_usages"][0]["quest_title"], "Shell Run")

    def test_unknown_goal_falls_back_to_balanced(self) -> None:
        plan = farming_plan(FakeRepository(), goal="unknown")

        self.assertEqual(plan["goal"], "balanced")
        self.assertTrue(plan["items"])


if __name__ == "__main__":
    unittest.main()
