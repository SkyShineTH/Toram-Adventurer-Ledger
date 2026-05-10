# Toram-Adventurer-Ledger AI Agent Instructions

This is the single source of truth for AI coding agents working in this repo. Keep it short, concrete, and executable. Do not duplicate these rules in other agent-specific files.

## Mission

Build a data warehouse and AI recommendation/RAG system for Toram Online returning players who want efficient casual gameplay. Transform raw JSON data for items, maps, monsters, quests, NPCs, and drops into a validated relational model that supports graph traversal, recommendations, and semantic search.

## Current Architecture

- Raw data: JSON files under the repo-local `data/raw/` directory. Treat this data as immutable input.
- Data engineering: Python with Pandas and DuckDB for profiling, cleaning, validation, and normalization.
- Database: PostgreSQL with `pgvector` as the source of truth for relational data and embeddings.
- Backend: FastAPI with NetworkX for in-memory graph/path analysis and LlamaIndex or LangChain for RAG.
- Frontend: Next.js, Tailwind CSS, and shadcn/ui for dashboard and explorer workflows.

## Core Data Model Direction

Design around linked game entities:

- `maps`
- `monsters`
- `items`
- `drops`
- `npcs`
- `quests`
- `quest_objectives`
- recommendation marts such as `leveling_routes`, `quest_efficiency`, and `farming_spots`

Preserve relationships for graph queries such as `Map -> Monster -> Drop -> Item -> Quest`.

## Non-Negotiable Guardrails

- Never modify files under `data/raw/` directly.
- Never skip data validation before loading or transforming data.
- Invalid records must be isolated into a dead-letter file, table, or report.
- Preserve traceability fields where applicable: `source_url`, `captured_at`, `verified_status`, and `patch_version`.
- Do not introduce secrets, API keys, credentials, or local machine paths into committed files.
- Prefer simple implementation over enterprise complexity unless the data model or validation requirement justifies it.

## Agent Workflow

- Inspect existing files before making changes.
- Keep changes scoped to the requested task and current project stage.
- When adding ETL logic, include validation and invalid-record handling in the same change.
- When changing schema, update related migration notes or documentation.
- When adding API behavior, document request and response shapes.
- When adding UI behavior, keep it aligned with planner, explorer, and recommendation workflows.
- If required commands are missing because the repo is not scaffolded yet, say so clearly instead of inventing commands.

## Validation Expectations

For data work, validate at minimum:

- required fields
- column/type consistency
- duplicate IDs or names where uniqueness is expected
- foreign-key-like references between entities
- source and capture metadata
- patch/version compatibility

## Definition of Done

- Raw data remains untouched.
- Validation behavior is explicit.
- Data relationships remain usable for graph traversal and RAG.
- Any schema or API contract change is documented.
- Available tests, linting, build, or validation commands have been run.
- Missing environment prerequisites or unavailable commands are reported clearly.
