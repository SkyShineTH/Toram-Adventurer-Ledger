import Link from "next/link";
import { fetchApi } from "../api-client";
import { entityHref } from "../entity-links";
import { PlannerContextBar } from "../planner-context";
import { ApiUnavailableNotice } from "../runtime-state";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Citation = {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
};

type AskResult = {
  query: string;
  mode: string;
  answer: string;
  citations: Citation[];
  limitations: string[];
};

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function askLedger(query: string, entityType: string) {
  if (!query.trim()) {
    return {
      data: {
        query,
        mode: "lexical_cited",
        answer: "Ask about a quest, item, monster, map, farming target, or route.",
        citations: [],
        limitations: ["Enter a question to retrieve cited ledger context."],
      },
      error: null,
    };
  }
  const params = new URLSearchParams({ q: query, limit: "5" });
  if (entityType) params.set("entity_type", entityType);
  const result = await fetchApi<AskResult>(`/rag/ask?${params.toString()}`);
  return result.ok ? { data: result.data, error: null } : { data: null, error: result.message };
}

export default async function AskPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const query = firstValue(params.q);
  const entityType = firstValue(params.entity_type);
  const { data, error } = await askLedger(query, entityType);

  return (
    <main className="shell">
      <nav className="topNav" aria-label="Page navigation">
        <Link href="/">Dashboard</Link>
        <Link href="/search">Search</Link>
        <Link href="/recommendations">Routes</Link>
        <Link href="/farming">Farming</Link>
        <span>Ask Ledger</span>
      </nav>

      <section className="explorerHero">
        <p className="eyebrow">Ask Ledger</p>
        <h1>Ask a question and keep the citations visible.</h1>
        <p className="lede">
          This first RAG pass uses lexical retrieval over `search_documents` and returns cited context. Embeddings
          and LLM synthesis can plug into the same surface later.
        </p>
      </section>

      <form className="searchForm">
        <label>
          <span>Question</span>
          <input name="q" defaultValue={query} placeholder="Lv 70 quest shell route, wind monster, spina target" />
        </label>
        <label>
          <span>Scope</span>
          <select name="entity_type" defaultValue={entityType}>
            <option value="">All</option>
            <option value="item">Items</option>
            <option value="monster">Monsters</option>
            <option value="quest">Quests</option>
            <option value="map">Maps</option>
          </select>
        </label>
        <button type="submit">Ask</button>
      </form>

      {error ? <ApiUnavailableNotice message={error} /> : null}

      <PlannerContextBar
        title="Ask context"
        chips={[
          { label: "Question", value: query.trim() || "Not set", tone: query.trim() ? "good" : "warn" },
          { label: "Scope", value: entityType || "All entities" },
          { label: "Mode", value: data?.mode ?? "Unavailable" },
          { label: "Citations", value: String(data?.citations.length ?? 0), tone: data?.citations.length ? "good" : "warn" },
        ]}
        state={{ path: "/ask", label: "Ask Ledger", params: { q: query, entity_type: entityType } }}
      />

      <section className="recommendationGrid">
        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">{data?.mode ?? "retrieval"} answer</p>
            <h2>Ledger response</h2>
          </div>
          <p className="lede detailNote">{data?.answer ?? "Ask Ledger is unavailable."}</p>
          <div className="questStats">
            {(data?.limitations ?? []).map((limitation) => (
              <span key={limitation}>{limitation}</span>
            ))}
          </div>
        </article>

        <article className="ledgerBlock">
          <div className="sectionHead">
            <p className="eyebrow">Citations</p>
            <h2>{data?.citations.length ? "Inspect sources" : "No sources yet"}</h2>
          </div>
          <div className="resultList">
            {(data?.citations ?? []).map((citation) => (
              <article className="searchResult" key={citation.id}>
                <div>
                  <strong>
                    {entityHref(citation.entity_type, citation.entity_id) ? (
                      <Link href={entityHref(citation.entity_type, citation.entity_id) ?? "#"}>{citation.title}</Link>
                    ) : (
                      citation.title
                    )}
                  </strong>
                  <span>{citation.entity_type}</span>
                </div>
                <p>{citation.content}</p>
                <small>
                  entity {citation.entity_id} / score {Number(citation.score).toLocaleString()}
                </small>
              </article>
            ))}
            {data?.citations.length ? null : <p className="emptyState">Ask a question to retrieve cited ledger entries.</p>}
          </div>
        </article>
      </section>
    </main>
  );
}
