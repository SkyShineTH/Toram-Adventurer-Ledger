import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR_PATH = ROOT / "scripts" / "02_validate_raw_data.py"


def load_validator():
    spec = importlib.util.spec_from_file_location("validator", VALIDATOR_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load validator from {VALIDATOR_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class RawValidationTests(unittest.TestCase):
    def test_raw_sample_fixture_passes_validation(self) -> None:
        validator = load_validator()
        result = validator.validate(ROOT / "tests" / "fixtures" / "raw_sample")

        self.assertEqual(result.errors, [])
        self.assertEqual(result.counts["records"]["items"], 1)
        self.assertEqual(result.counts["records"]["maps"], 1)
        self.assertEqual(result.counts["records"]["monsters"], 1)
        self.assertEqual(result.counts["records"]["quests"], 1)


if __name__ == "__main__":
    unittest.main()

