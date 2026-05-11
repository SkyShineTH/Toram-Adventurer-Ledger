import os
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.repositories import JsonLedgerRepository, PostgresLedgerRepository, create_repository


class RepositoryFactoryTests(unittest.TestCase):
    def test_default_repository_is_json(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            repository = create_repository(Path("processed"), Path("validation"))

        self.assertIsInstance(repository, JsonLedgerRepository)

    def test_postgres_repository_requires_database_url(self) -> None:
        with patch.dict(os.environ, {"LEDGER_REPOSITORY": "postgres"}, clear=True):
            with self.assertRaises(RuntimeError):
                create_repository(Path("processed"), Path("validation"))

    def test_postgres_repository_uses_database_url(self) -> None:
        with patch.dict(
            os.environ,
            {"LEDGER_REPOSITORY": "postgres", "DATABASE_URL": "postgresql://example"},
            clear=True,
        ):
            repository = create_repository(Path("processed"), Path("validation"))

        self.assertIsInstance(repository, PostgresLedgerRepository)


if __name__ == "__main__":
    unittest.main()
