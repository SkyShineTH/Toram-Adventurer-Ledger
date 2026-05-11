import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from dotenv import load_dotenv


class EnvLoadingTests(unittest.TestCase):
    def test_dotenv_does_not_override_existing_shell_values(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            env_path = Path(temp_dir) / ".env"
            env_path.write_text("LEDGER_REPOSITORY=postgres\n", encoding="utf-8")

            with patch.dict(os.environ, {"LEDGER_REPOSITORY": "json"}, clear=True):
                load_dotenv(env_path, override=False)
                self.assertEqual(os.environ["LEDGER_REPOSITORY"], "json")


if __name__ == "__main__":
    unittest.main()
