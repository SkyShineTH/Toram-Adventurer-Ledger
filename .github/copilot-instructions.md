# Project Vision: Toram-Adventurer-Ledger

## Context & Background
This project builds a Data Warehouse and an AI Recommendation system (RAG) for Toram Online. Target audience: returning players seeking efficient, casual gameplay (Smart Play) using data-driven insights.
Goal: Transform raw JSON data (Items, Maps, Monsters, Quests) into a linked relational database optimized for AI (RAG).

## Tech Stack (Decoupled Architecture with In-Memory Graph)
- **Data Engineering:** Python (Pandas/DuckDB) to clean, validate, and normalize raw JSON from `Data/raw/`.
- **Database:** PostgreSQL + `pgvector` (for vector embeddings) acting as the Single Source of Truth.
- **Backend API & Compute:** FastAPI (Python) + `NetworkX` (for in-memory graph pathfinding) + `LlamaIndex`/`LangChain` for RAG.
- **Frontend Web App:** Next.js (React) + Tailwind CSS + shadcn/ui.

## Architecture & Data Pipeline (Medallion Concept)
1. **Staging & Normalization Layer:**
   - Transform raw data into a relational schema (`quests`, `quest_objectives`, `npcs`, `drops`, `items`).
   - **Graph Database Concept:** Design schema considering Node & Edge relationships (e.g., Map -> Monster -> Drop -> Item -> Quest).
2. **Data Validation & Reliability:**
   - **Strict Validation:** Enforce column types, foreign keys, duplicate IDs, and source checks before insertion.
   - **Traceability:** Include reliability fields (`source_url`, `captured_at`, `verified_status`).
   - **Patch Versioning:** Implement a patch version tracking system (e.g., `patch_version`).
3. **Recommendation-Ready Data Mart:**
   - Create aggregated tables/views for recommendations (`leveling_routes`, `quest_efficiency`).
4. **AI / RAG Readiness:**
   - Structure schema and documents to support Semantic Search via pgvector.

## Core Modules & Features
- **Build Profile Planner:** Store user profiles (Weapon type, stats, goal, budget) for contextual recommendations.
- **Side Quest Helper:** Find optimal quests, calculate EXP/time efficiency, identify farm locations and NPCs.
- **Farming & Spina Planner:** Analyze farm spots (NPC sell, quest materials, market items).
- **Gear Recommendation:** Suggest gear upgrades based on Build Profile.
- **Dashboard / Explorer UI:** UI to search and view relationships between Items, Quests, Monsters, and Maps.

## Development Constraints & Rules (Blast-radius guardrails)
- **NEVER** skip Data Validation. Invalid data must be isolated (dead-letter queue).
- **ALWAYS** design schemas with Semantic Search and Graph Analysis in mind.
- **KISS Principle:** Keep it simple. Avoid overengineering for a hobby project, but maintain a robust data architecture.
- **Read-Only Raw Data:** **NEVER** modify files in `Data/raw/` directly. Always use Python scripts to process and load data into the database.
