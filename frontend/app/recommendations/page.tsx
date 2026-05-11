import Link from "next/link";
import { fetchApi } from "../api-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type GraphSummary = {
  nodes: number;
  edges: number;
  nodes_by_kind: Record<string, number>;
  edges_by_relation: Record<string, number>;
};

type QuestRecommendation = {
  id: number;
  title: string;
  level_required: number | null;
  exp_reward: number | null;
  npc_name: string | null;
  objective_count: number;
  exp_per_objective: number;
};

type LevelingRecommendation = {
  map_id: number | null;
  map_name: string;
  monster_count: number;
  average_exp: number;
  monsters: Array<{ id: number; name: string; level: number | null; exp: number | null; element_label?: string | null }>;
};

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseLevel(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 70;
  return Math.max(1, Math.min(300, parsed));
}

async function getRecommendations(playerLevel: number) {
  const [graph, quests, leveling] = await Promise.all([
    fetchApi<GraphSummary>("/graph/summary"),
    fetchApi<{ items: QuestRecommendation[] }>(`/recommendations/quests?player_level=${playerLevel}&limit=6`),
    fetchApi<{ items: LevelingRecommendation[] }>(
      `/recommendations/leveling?player_level=${playerLevel}&window=10&limit=4`,
    ),
  ]);

  return {
    graph: graph.ok ? graph.data : null,
    quests: quests.ok ? quests.data.items : [],
    leveling: leveling.ok ? leveling.data.items : [],
  };
}

export default async function RecommendationsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const levelInput = firstValue(params.level);
  const playerLevel = parseLevel(levelInput);
  const { graph, quests, leveling } = await getRecommendations(playerLevel);

  return (
    <main className="shell">
      <nav className="topNav">
        <Link href="/">Dashboard</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/quality">Data Quality</Link>
        <span>Recommendations</span>
      </nav>

      <section className="explorerHero">
        <p className="eyebrow">Graph recommendations</p>
        <h1>Turn the ledger into the next practical route.</h1>
        <p className="lede">
          NetworkX builds an in-memory graph from validated entities. This first pass ranks side quests and
          leveling maps from the relationships currently available.
        </p>
      </section>

      <form className="levelForm">
        <label>
          <span>Player level</span>
          <input name="level" inputMode="numeric" defaultValue={String(playerLevel)} />
        </label>
        <button type="submit">Recalculate</button>
      </form>

      <section className="recommendationGrid">
        <article className="ledgerBlock statusCard">
          <p className="eyebrow">Graph shape</p>
          <strong>{graph?.nodes.toLocaleString() ?? "-"}</strong>
          <span>{graph?.edges.toLocaleString() ?? "-"} relationships</span>
          <small>
            {Object.entries(graph?.nodes_by_kind ?? {})
              .map(([kind, count]) => `${kind}: ${count}`)
              .join(" / ")}
          </small>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Quest efficiency</p>
            <h2>Best side quest leads</h2>
          </div>
          <div className="tableLike">
            {quests.map((quest) => (
              <div className="row" key={quest.id}>
                <span>{quest.title}</span>
                <span>{quest.objective_count} objectives</span>
                <strong>{quest.exp_per_objective.toLocaleString()} EXP/objective</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Leveling route candidates</p>
            <h2>Maps near level {playerLevel}</h2>
          </div>
          <div className="routeList">
            {leveling.map((route) => (
              <section className="routeCard" key={`${route.map_id}:${route.map_name}`}>
                <div>
                  <strong>{route.map_name}</strong>
                  <span>
                    {route.monster_count} monsters / avg {route.average_exp.toLocaleString()} EXP
                  </span>
                </div>
                <ul>
                  {route.monsters.map((monster) => (
                    <li key={monster.id}>
                      {monster.name} · Lv {monster.level ?? "?"} · {monster.exp?.toLocaleString() ?? "?"} EXP
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
