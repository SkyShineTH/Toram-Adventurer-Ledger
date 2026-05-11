import Link from "next/link";
import { fetchApi } from "../api-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type SideQuestRecommendation = {
  id: number;
  title: string;
  type: string | null;
  level_required: number;
  level_gap: number;
  exp_reward: number;
  exp_per_objective: number;
  objective_count: number;
  npc_name: string | null;
  required_items: Array<{ item_id: number | null; item_name: string | null; objective: string | null }>;
  score: number;
  reason: string;
};

const GOALS = [
  { value: "balanced", label: "Balanced" },
  { value: "exp", label: "EXP Focus" },
  { value: "item_collection", label: "Item Collection" },
];

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseLevel(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 70;
  return Math.max(1, Math.min(300, parsed));
}

function parseGoal(value: string): string {
  return GOALS.some((goal) => goal.value === value) ? value : "balanced";
}

async function getSideQuests(playerLevel: number, goal: string): Promise<SideQuestRecommendation[]> {
  const result = await fetchApi<{ items: SideQuestRecommendation[] }>(
    `/side-quests/recommendations?player_level=${playerLevel}&goal=${goal}&limit=8`,
  );
  return result.ok ? result.data.items : [];
}

export default async function SideQuestsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const playerLevel = parseLevel(firstValue(params.level));
  const goal = parseGoal(firstValue(params.goal));
  const quests = await getSideQuests(playerLevel, goal);

  return (
    <main className="shell">
      <nav className="topNav">
        <Link href="/">Dashboard</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/recommendations">Recommendations</Link>
        <Link href="/quality">Data Quality</Link>
        <span>Side Quests</span>
      </nav>

      <section className="explorerHero">
        <p className="eyebrow">Side Quest Helper</p>
        <h1>Find the quests worth doing before you open a wiki tab.</h1>
        <p className="lede">
          Filter by your current level and goal. The helper ranks available quests by EXP efficiency,
          objective count, linked material requirements, and NPC handoff visibility.
        </p>
      </section>

      <form className="searchForm">
        <label>
          <span>Player level</span>
          <input name="level" inputMode="numeric" defaultValue={String(playerLevel)} />
        </label>
        <label>
          <span>Goal</span>
          <select name="goal" defaultValue={goal}>
            {GOALS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Find quests</button>
      </form>

      <section className="questHelperGrid">
        <article className="ledgerBlock statusCard">
          <p className="eyebrow">Current context</p>
          <strong>Lv {playerLevel}</strong>
          <span>{GOALS.find((option) => option.value === goal)?.label}</span>
          <small>Ranking is deterministic and uses validated quest/objective data only.</small>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Recommended side quests</p>
            <h2>Best fits for this run</h2>
          </div>
          {quests.length > 0 ? (
            <div className="questCardList">
              {quests.map((quest) => (
                <section className="questCard" key={quest.id}>
                  <div className="questCardHeader">
                    <div>
                      <strong>{quest.title}</strong>
                      <span>
                        Lv {quest.level_required} / {quest.npc_name ?? "Unknown NPC"}
                      </span>
                    </div>
                    <b>{quest.exp_reward.toLocaleString()} EXP</b>
                  </div>
                  <p>{quest.reason}</p>
                  <div className="questStats">
                    <span>{quest.exp_per_objective.toLocaleString()} EXP/objective</span>
                    <span>{quest.objective_count} objective(s)</span>
                    <span>Score {quest.score.toLocaleString()}</span>
                  </div>
                  {quest.required_items.length > 0 ? (
                    <ul>
                      {quest.required_items.slice(0, 3).map((item) => (
                        <li key={`${quest.id}:${item.item_id ?? item.item_name}`}>
                          {item.item_name ?? "Unknown item"}: {item.objective ?? "Objective details unavailable"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <small>No linked item objective in the current dataset.</small>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <p className="emptyState">No quest candidates found. Check whether the backend has loaded processed data.</p>
          )}
        </article>
      </section>
    </main>
  );
}
