import Link from "next/link";
import { fetchApi } from "../api-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type FarmingCandidate = {
  item_id: number;
  item_name: string | null;
  type_label: string | null;
  sell: number | null;
  quest_usage_count: number;
  quest_usages: Array<{
    quest_id: number;
    quest_title: string | null;
    npc_name: string | null;
    level_required: number | null;
    exp_reward: number | null;
    objective: string | null;
  }>;
  score: number;
  reason: string;
};

type FarmingPlan = {
  goal: string;
  player_level: number | null;
  items: FarmingCandidate[];
  limitations: string[];
};

const GOALS = [
  { value: "balanced", label: "Balanced" },
  { value: "npc_sell", label: "NPC sell value" },
  { value: "quest_material", label: "Quest materials" },
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

async function getFarmingPlan(goal: string, playerLevel: number): Promise<FarmingPlan> {
  const result = await fetchApi<FarmingPlan>(`/farming/plan?goal=${goal}&player_level=${playerLevel}&limit=10`);
  return result.ok
    ? result.data
    : {
        goal,
        player_level: playerLevel,
        items: [],
        limitations: ["Farming plan is unavailable. Check whether the backend has loaded processed data."],
      };
}

export default async function FarmingPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const playerLevel = parseLevel(firstValue(params.level));
  const goal = parseGoal(firstValue(params.goal));
  const plan = await getFarmingPlan(goal, playerLevel);

  return (
    <main className="shell">
      <nav className="topNav">
        <Link href="/">Dashboard</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/side-quests">Side Quests</Link>
        <span>Farming</span>
      </nav>

      <section className="explorerHero">
        <p className="eyebrow">Farming And Spina Planner Lite</p>
        <h1>Pick targets first. Confirm drop locations second.</h1>
        <p className="lede">
          The current ledger can rank farming targets by NPC sell value and quest material usage. It does not yet
          claim monster drop routes until validated drop relationships are loaded.
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
        <button type="submit">Plan farming</button>
      </form>

      <section className="farmingGrid">
        <article className="ledgerBlock statusCard">
          <p className="eyebrow">Planner mode</p>
          <strong>{GOALS.find((option) => option.value === plan.goal)?.label ?? "Balanced"}</strong>
          <span>Lv {playerLevel}</span>
          <small>Target ranking only; no invented drop locations.</small>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Target candidates</p>
            <h2>Items worth checking</h2>
          </div>
          {plan.items.length > 0 ? (
            <div className="questCardList">
              {plan.items.map((item) => (
                <section className="questCard" key={item.item_id}>
                  <div className="questCardHeader">
                    <div>
                      <strong>
                        <Link href={`/items/${item.item_id}`}>{item.item_name ?? `Item ${item.item_id}`}</Link>
                      </strong>
                      <span>{item.type_label ?? "unknown type"}</span>
                    </div>
                    <b>{item.sell?.toLocaleString() ?? "-"} spina</b>
                  </div>
                  <p>{item.reason}</p>
                  <div className="questStats">
                    <span>{item.quest_usage_count} quest use(s)</span>
                    <span>Score {item.score.toLocaleString()}</span>
                  </div>
                  {item.quest_usages.length > 0 ? (
                    <ul>
                      {item.quest_usages.slice(0, 3).map((usage) => (
                        <li key={`${item.item_id}:${usage.quest_id}:${usage.objective}`}>
                          <Link href={`/quests/${usage.quest_id}`}>{usage.quest_title ?? `Quest ${usage.quest_id}`}</Link>
                          {usage.npc_name ? ` / ${usage.npc_name}` : ""}: {usage.objective ?? "Objective unavailable"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <small>No linked quest usage in the current dataset.</small>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <p className="emptyState">No farming candidates found for this goal.</p>
          )}
        </article>

        <article className="ledgerBlock">
          <div className="sectionHead">
            <p className="eyebrow">Data boundary</p>
            <h2>Current limitations</h2>
          </div>
          <div className="compactList">
            {plan.limitations.map((limitation) => (
              <div key={limitation}>
                <span>{limitation}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
