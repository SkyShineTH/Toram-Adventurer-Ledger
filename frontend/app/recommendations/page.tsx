import Link from "next/link";
import { fetchApi } from "../api-client";
import { PlannerContextBar } from "../planner-context";
import { ApiUnavailableNotice, LoaderRequiredNotice } from "../runtime-state";

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
    error: graph.ok ? (quests.ok ? (leveling.ok ? null : leveling.message) : quests.message) : graph.message,
  };
}

export default async function RecommendationsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const levelInput = firstValue(params.level);
  const playerLevel = parseLevel(levelInput);
  const { graph, quests, leveling, error } = await getRecommendations(playerLevel);

  return (
    <main className="shell">
      <nav className="topNav" aria-label="Page navigation">
        <Link href="/">Dashboard</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/farming">Farming</Link>
        <Link href="/side-quests">Side Quests</Link>
        <Link href="/quality">Data Quality</Link>
        <span>Recommendations</span>
      </nav>

      <section className="explorerHero">
        <p className="eyebrow">Route board</p>
        <h1>Compare practical leads near your current level.</h1>
        <p className="lede">
          These suggestions come from the validated graph currently loaded in PostgreSQL. Treat them as good
          session candidates, then inspect details before committing time in game.
        </p>
      </section>

      <form className="levelForm routeControl">
        <label>
          <span>Player level</span>
          <input name="level" inputMode="numeric" defaultValue={String(playerLevel)} />
        </label>
        <button type="submit">Refresh routes</button>
      </form>

      {error ? <ApiUnavailableNotice message={error} /> : null}
      {!error && graph && graph.nodes === 0 ? <LoaderRequiredNotice /> : null}

      <PlannerContextBar
        title="Route context"
        chips={[
          { label: "Level", value: `Lv ${playerLevel}`, tone: "good" },
          { label: "Quest leads", value: `${quests.length}` },
          { label: "Map leads", value: `${leveling.length}` },
          { label: "Graph", value: graph ? `${graph.nodes.toLocaleString()} nodes` : "Unavailable", tone: graph ? "good" : "warn" },
        ]}
        state={{ path: "/recommendations", label: "Route board", params: { level: playerLevel } }}
      />

      <section className="recommendationGrid">
        <article className="ledgerBlock statusCard">
          <p className="eyebrow">Data confidence</p>
          <strong>{graph?.nodes.toLocaleString() ?? "-"}</strong>
          <span>{graph?.edges.toLocaleString() ?? "-"} known relationships</span>
          <small>
            {Object.entries(graph?.nodes_by_kind ?? {})
              .map(([kind, count]) => `${kind}: ${count}`)
              .join(" / ")}
          </small>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Quest routes</p>
            <h2>Good EXP leads for Lv {playerLevel}</h2>
          </div>
          <div className="routeList">
            {quests.length > 0 ? (
              quests.map((quest) => (
                <Link className="routeCard routeCardLink" href={`/quests/${quest.id}`} key={quest.id}>
                  <div>
                    <strong>{quest.title}</strong>
                    <span>{quest.npc_name ?? "NPC unknown"} / {quest.objective_count} objective(s)</span>
                  </div>
                  <div className="routeMeta">
                    <span>Lv {quest.level_required ?? "?"}</span>
                    <span>{quest.exp_reward?.toLocaleString() ?? "?"} EXP</span>
                    <b>{quest.exp_per_objective.toLocaleString()} EXP/objective</b>
                  </div>
                </Link>
              ))
            ) : (
              <p className="emptyState">No quest leads matched this level. Try widening the level assumption.</p>
            )}
          </div>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Map routes</p>
            <h2>Monster bands near Lv {playerLevel}</h2>
          </div>
          <div className="routeList">
            {leveling.length > 0 ? (
              leveling.map((route) => (
                <section className="routeCard" key={`${route.map_id}:${route.map_name}`}>
                  <div>
                    <strong>
                      {route.map_id ? <Link href={`/maps/${route.map_id}`}>{route.map_name}</Link> : route.map_name}
                    </strong>
                    <span>
                      {route.monster_count} monsters / avg {route.average_exp.toLocaleString()} EXP
                    </span>
                  </div>
                  <ul>
                    {route.monsters.map((monster) => (
                      <li key={monster.id}>
                        {monster.name} / Lv {monster.level ?? "?"} / {monster.exp?.toLocaleString() ?? "?"} EXP
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <p className="emptyState">No map routes matched this level. Try another level or inspect Explorer.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
