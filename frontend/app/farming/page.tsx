import Link from "next/link";
import { ComparePanel, type CompareItem } from "../compare-panel";
import { fetchApi } from "../api-client";
import { PlannerContextBar } from "../planner-context";
import { ApiUnavailableNotice, LoaderRequiredNotice } from "../runtime-state";

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
  error: string | null;
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
  const result = await fetchApi<Omit<FarmingPlan, "error">>(
    `/farming/plan?goal=${goal}&player_level=${playerLevel}&limit=10`,
  );
  return result.ok
    ? { ...result.data, error: null }
    : {
        goal,
        player_level: playerLevel,
        items: [],
        error: result.message,
        limitations: ["Farming plan is unavailable. Check whether the backend has loaded processed data."],
      };
}

export default async function FarmingPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const playerLevel = parseLevel(firstValue(params.level));
  const goal = parseGoal(firstValue(params.goal));
  const plan = await getFarmingPlan(goal, playerLevel);
  const compareItems: CompareItem[] = plan.items.map((item) => ({
    id: String(item.item_id),
    title: item.item_name ?? `Item ${item.item_id}`,
    href: `/items/${item.item_id}`,
    meta: `${item.type_label ?? "unknown type"} / ${item.sell?.toLocaleString() ?? "-"} spina`,
    facts: [
      { label: "NPC sell", value: `${item.sell?.toLocaleString() ?? "-"} spina` },
      { label: "Quest use", value: `${item.quest_usage_count} quest(s)` },
      { label: "Score", value: item.score.toLocaleString() },
      { label: "Route status", value: item.quest_usages.length ? "Linked quest usage" : "Needs manual route check" },
      { label: "Reason", value: item.reason },
    ],
  }));

  return (
    <main className="shell">
      <nav className="topNav" aria-label="Page navigation">
        <Link href="/">Dashboard</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/side-quests">Side Quests</Link>
        <span>Farming</span>
      </nav>

      <section className="explorerHero">
        <p className="eyebrow">Farming board</p>
        <h1>Pick targets first, then verify the route in game.</h1>
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

      {plan.error ? <ApiUnavailableNotice message={plan.error} /> : null}

      <PlannerContextBar
        title="Farming context"
        chips={[
          { label: "Level", value: `Lv ${playerLevel}`, tone: "good" },
          { label: "Goal", value: GOALS.find((option) => option.value === goal)?.label ?? goal },
          { label: "Data boundary", value: "Target ranking only", tone: "warn" },
          { label: "Results", value: `${plan.items.length} candidate(s)`, tone: plan.items.length ? "good" : "warn" },
        ]}
        state={{ path: "/farming", label: "Farming planner", params: { level: playerLevel, goal } }}
      />

      <section className="farmingGrid">
        <article className="ledgerBlock statusCard">
          <p className="eyebrow">Current assumptions</p>
          <strong>{GOALS.find((option) => option.value === plan.goal)?.label ?? "Balanced"}</strong>
          <span>Lv {playerLevel}</span>
          <small>Target ranking only; no invented drop locations.</small>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Target candidates</p>
            <h2>Good farming leads with current filters</h2>
          </div>
          {plan.items.length > 0 ? (
            <div className="questCardList farmingCards">
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
                  <p className="routeReason">{item.reason}</p>
                  <div className="questStats">
                    <span>{item.quest_usage_count} quest use(s)</span>
                    <span>Score {item.score.toLocaleString()}</span>
                    <span>{item.quest_usages.length > 0 ? "Linked to quests" : "Needs route check"}</span>
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
            <>{plan.error ? null : <LoaderRequiredNotice />}</>
          )}
        </article>

        <article className="ledgerBlock">
          <div className="sectionHead">
            <p className="eyebrow">Data boundary</p>
            <h2>What this board will not claim</h2>
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

      <ComparePanel items={compareItems} label="Farming target" />
    </main>
  );
}
