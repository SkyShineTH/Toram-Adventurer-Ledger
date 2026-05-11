import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LOADER_PATH = ROOT / "scripts" / "03_load_postgres.py"


def load_loader():
    spec = importlib.util.spec_from_file_location("postgres_loader", LOADER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load loader from {LOADER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PostgresLoaderTests(unittest.TestCase):
    def test_sanitize_quest_objectives_nulls_missing_item_references(self) -> None:
        loader = load_loader()
        rows = [
            {"id": "1:0", "target_item_id": 10},
            {"id": "1:1", "target_item_id": 99},
            {"id": "1:2", "target_item_id": None},
        ]

        sanitized = loader.sanitize_quest_objectives(rows, {10})

        self.assertEqual(sanitized[0]["target_item_id"], 10)
        self.assertIsNone(sanitized[1]["target_item_id"])
        self.assertIsNone(sanitized[2]["target_item_id"])
        self.assertEqual(rows[1]["target_item_id"], 99)


if __name__ == "__main__":
    unittest.main()
