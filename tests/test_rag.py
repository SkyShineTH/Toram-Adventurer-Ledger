import unittest

from backend.rag import ask_ledger


class FakeRepository:
    def search_documents(self, query: str, entity_type: str | None = None, limit: int = 10):
        rows = [
            {
                "id": "quest:10",
                "entity_type": "quest",
                "entity_id": "10",
                "title": "Shell Run",
                "content": "Shell Run quest Lefina 1000 Collect Quest Shell",
                "metadata": {"level_required": 20, "exp_reward": 1000, "npc_name": "Lefina"},
                "score": 2.0,
            },
            {
                "id": "item:2",
                "entity_type": "item",
                "entity_id": "2",
                "title": "Quest Shell",
                "content": "Quest Shell [Material]",
                "metadata": {"type_label": "[Material]", "sell": 10},
                "score": 1.0,
            },
        ]
        if entity_type:
            rows = [row for row in rows if row["entity_type"] == entity_type]
        return rows[:limit]


class AskLedgerTests(unittest.TestCase):
    def test_ask_ledger_returns_cited_answer(self) -> None:
        result = ask_ledger(FakeRepository(), query="quest shell")

        self.assertEqual(result["mode"], "lexical_cited")
        self.assertIn("Shell Run", result["answer"])
        self.assertEqual(result["citations"][0]["entity_type"], "quest")

    def test_ask_ledger_handles_empty_query(self) -> None:
        result = ask_ledger(FakeRepository(), query=" ")

        self.assertEqual(result["citations"], [])
        self.assertIn("No query", result["limitations"][0])


if __name__ == "__main__":
    unittest.main()
