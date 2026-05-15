import Link from "next/link";
import { fetchApi } from "../api-client";
import { entityHref } from "../entity-links";
import { PlannerContextBar } from "../planner-context";
import { ApiUnavailableNotice } from "../runtime-state";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type SearchResult = {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
};

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function getSearchResults(query: string, entityType: string) {
  if (!query.trim()) return { mode: "lexical", items: [] as SearchResult[], error: null };
  const params = new URLSearchParams({ q: query, limit: "12" });
  if (entityType) params.set("entity_type", entityType);
  const result = await fetchApi<{ mode: string; items: SearchResult[] }>(`/search?${params.toString()}`);
  return result.ok ? { ...result.data, error: null } : { mode: "lexical", items: [], error: result.message };
}

export default async function SearchPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const query = firstValue(params.q);
  const entityType = firstValue(params.entity_type);
  const results = await getSearchResults(query, entityType);

  return (
    <main className="shell">
      <nav className="topNav" aria-label="Page navigation">
        <Link href="/">Dashboard</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/recommendations">Recommendations</Link>
        <span>Search</span>
      </nav>

      <section className="explorerHero">
        <p className="eyebrow">RAG foundation</p>
        <h1>Search the document mart before embeddings arrive.</h1>
        <p className="lede">
          This uses lexical scoring over the same `search_documents` mart that will later hold pgvector embeddings.
          It gives contributors a concrete retrieval surface before LLM answers are enabled.
        </p>
      </section>

      <form className="searchForm">
        <label>
          <span>Query</span>
          <input name="q" defaultValue={query} placeholder="Ghostfire, Yunis quest, wind monster" />
        </label>
        <label>
          <span>Entity type</span>
          <select name="entity_type" defaultValue={entityType}>
            <option value="">All</option>
            <option value="item">Items</option>
            <option value="monster">Monsters</option>
            <option value="quest">Quests</option>
            <option value="map">Maps</option>
          </select>
        </label>
        <button type="submit">Search</button>
      </form>

      {results.error ? <ApiUnavailableNotice message={results.error} /> : null}

      <PlannerContextBar
        title="Search context"
        chips={[
          { label: "Query", value: query.trim() || "Not set", tone: query.trim() ? "good" : "warn" },
          { label: "Scope", value: entityType || "All entities" },
          { label: "Mode", value: results.mode },
          { label: "Matches", value: String(results.items.length), tone: results.items.length ? "good" : "warn" },
        ]}
        state={{ path: "/search", label: "Search", params: { q: query, entity_type: entityType } }}
      />

      <section className="ledgerBlock searchResults">
        <div className="sectionHead">
          <p className="eyebrow">{results.mode} retrieval</p>
          <h2>{results.items.length ? `${results.items.length} matches` : "No matches yet"}</h2>
        </div>
        <div className="resultList">
          {results.items.length > 0 ? (
            results.items.map((item) => (
              <article className="searchResult" key={item.id}>
                <div>
                  <strong>
                    {entityHref(item.entity_type, item.entity_id) ? (
                      <Link href={entityHref(item.entity_type, item.entity_id) ?? "#"}>{item.title}</Link>
                    ) : (
                      item.title
                    )}
                  </strong>
                  <span>{item.entity_type}</span>
                </div>
                <p>{item.content}</p>
                <small>
                  entity {item.entity_id} / score {Number(item.score).toLocaleString()}
                </small>
              </article>
            ))
          ) : (
            <p className="emptyState">
              {query.trim()
                ? "No records matched this query. Try a broader term or confirm the loader has run."
                : "Enter a query to search items, maps, monsters, and quests."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
