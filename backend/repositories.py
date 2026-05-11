from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol


class LedgerRepository(Protocol):
    def smart_play_summary(self) -> dict[str, Any]:
        ...

    def validation_summary(self) -> dict[str, Any]:
        ...

    def validation_findings(self) -> list[dict[str, Any]]:
        ...

    def dataset(self, name: str) -> list[dict[str, Any]]:
        ...


class MissingGeneratedFileError(FileNotFoundError):
    def __init__(self, path: Path) -> None:
        self.path = path
        super().__init__(f"Missing generated file: {path.name}")


class JsonLedgerRepository:
    def __init__(self, processed_dir: Path, validation_dir: Path) -> None:
        self.processed_dir = processed_dir
        self.validation_dir = validation_dir

    def smart_play_summary(self) -> dict[str, Any]:
        return self._read_json(self.processed_dir / "smart_play_summary.json")

    def validation_summary(self) -> dict[str, Any]:
        return self._read_json(self.validation_dir / "summary.json")

    def validation_findings(self) -> list[dict[str, Any]]:
        return self._read_jsonl(self.validation_dir / "dead_letter.jsonl")

    def dataset(self, name: str) -> list[dict[str, Any]]:
        return self._load_dataset(name)

    @lru_cache(maxsize=16)
    def _load_dataset(self, name: str) -> list[dict[str, Any]]:
        return self._read_jsonl(self.processed_dir / f"{name}.jsonl")

    def _read_json(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            raise MissingGeneratedFileError(path)
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _read_jsonl(self, path: Path) -> list[dict[str, Any]]:
        if not path.exists():
            raise MissingGeneratedFileError(path)
        rows: list[dict[str, Any]] = []
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
        return rows
