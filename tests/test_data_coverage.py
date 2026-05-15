import unittest

from backend.data_coverage import data_coverage


class FakeRepository:
    rows = {
        "items": [{"id": 1}],
        "maps": [{"id": 2}],
        "monsters": [{"id": 3}],
        "quests": [{"id": 4}],
        "quest_objectives": [{"id": "4:0"}],
    }

    def dataset(self, name: str):
        return self.rows[name]


class DataCoverageTests(unittest.TestCase):
    def test_drop_and_craft_relationships_are_explicitly_unavailable(self) -> None:
        coverage = data_coverage(FakeRepository())

        statuses = {row["name"]: row["status"] for row in coverage["relationships"]}
        self.assertEqual(statuses["maps -> monsters"], "available")
        self.assertEqual(statuses["monsters -> drops -> items"], "not_available")
        self.assertEqual(statuses["items -> crafting recipes"], "not_available")


if __name__ == "__main__":
    unittest.main()
