from __future__ import annotations

from typing import Any

from backend.repositories import LedgerRepository


def ask_ledger(
    repository: LedgerRepository,
    *,
    query: str,
    entity_type: str | None = None,
    limit: int = 5,
) -> dict[str, Any]:
    normalized_query = query.strip()
    if not normalized_query:
        return {
            "query": query,
            "mode": "lexical_cited",
            "answer": "Ask a question about an item, quest, monster, map, route, or farming target.",
            "citations": [],
            "limitations": ["No query was provided."],
        }

    documents = repository.search_documents(normalized_query, entity_type=entity_type, limit=max(1, min(limit, 8)))
    if not documents:
        return {
            "query": normalized_query,
            "mode": "lexical_cited",
            "answer": "I could not find a matching ledger entry for that question yet.",
            "citations": [],
            "limitations": [
                "This answer uses lexical retrieval only; embeddings and LLM synthesis are not enabled yet.",
                "Try broader entity names, NPC names, item names, or quest terms.",
            ],
        }

    lead = documents[0]
    citations = [citation_from_document(document) for document in documents]
    answer_parts = [
        f"The strongest ledger match is {lead.get('title')} ({lead.get('entity_type')} {lead.get('entity_id')}).",
        summarize_document(lead),
    ]
    if len(documents) > 1:
        related = ", ".join(str(document.get("title")) for document in documents[1:4])
        answer_parts.append(f"Related entries to inspect next: {related}.")

    return {
        "query": normalized_query,
        "mode": "lexical_cited",
        "answer": " ".join(part for part in answer_parts if part),
        "citations": citations,
        "limitations": [
            "This is retrieval-grounded guidance, not an LLM-generated final answer.",
            "Embeddings are not populated yet; ranking is lexical over search_documents.",
        ],
    }


def citation_from_document(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": document.get("id"),
        "entity_type": document.get("entity_type"),
        "entity_id": document.get("entity_id"),
        "title": document.get("title"),
        "content": document.get("content"),
        "metadata": document.get("metadata") or {},
        "score": float(document.get("score") or 0),
    }


def summarize_document(document: dict[str, Any]) -> str:
    metadata = document.get("metadata") or {}
    entity_type = document.get("entity_type")
    if entity_type == "quest":
        bits = [
            f"level {metadata.get('level_required')}" if metadata.get("level_required") is not None else "",
            f"{metadata.get('exp_reward')} EXP" if metadata.get("exp_reward") is not None else "",
            f"NPC {metadata.get('npc_name')}" if metadata.get("npc_name") else "",
        ]
        return "Quest context: " + ", ".join(bit for bit in bits if bit) + "."
    if entity_type == "monster":
        bits = [
            f"level {metadata.get('level')}" if metadata.get("level") is not None else "",
            f"map {metadata.get('map_name')}" if metadata.get("map_name") else "",
            f"element {metadata.get('element_label')}" if metadata.get("element_label") else "",
        ]
        return "Monster context: " + ", ".join(bit for bit in bits if bit) + "."
    if entity_type == "item":
        bits = [
            str(metadata.get("type_label") or ""),
            f"{metadata.get('sell')} spina sell value" if metadata.get("sell") is not None else "",
        ]
        return "Item context: " + ", ".join(bit for bit in bits if bit) + "."
    return str(document.get("content") or "")[:240]
