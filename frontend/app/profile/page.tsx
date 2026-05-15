import Link from "next/link";
import { PlannerContextBar } from "../planner-context";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const WEAPONS = [
  "One-Handed Sword",
  "Two-Handed Sword",
  "Bow",
  "Bowgun",
  "Staff",
  "Magic Device",
  "Knuckles",
  "Halberd",
  "Katana",
];

const GOALS = [
  { value: "balanced", label: "Balanced routing" },
  { value: "exp", label: "Level and EXP" },
  { value: "item_collection", label: "Quest material prep" },
  { value: "spina", label: "Spina farming" },
];

const BUDGETS = [
  { value: "low", label: "Low budget" },
  { value: "medium", label: "Medium budget" },
  { value: "high", label: "High budget" },
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

function allowedValue(value: string, allowed: string[], fallback: string): string {
  return allowed.includes(value) ? value : fallback;
}

function href(path: string, params: Record<string, string | number>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    query.set(key, String(value));
  }
  return `${path}?${query.toString()}`;
}

export default async function ProfilePage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const level = parseLevel(firstValue(params.level));
  const weapon = allowedValue(firstValue(params.weapon), WEAPONS, "Bow");
  const goal = allowedValue(firstValue(params.goal), GOALS.map((item) => item.value), "balanced");
  const budget = allowedValue(firstValue(params.budget), BUDGETS.map((item) => item.value), "low");
  const mainStat = firstValue(params.main_stat).trim() || suggestedStat(weapon);
  const sideQuestGoal = goal === "spina" ? "item_collection" : goal;
  const searchQuery = buildSearchQuery(weapon, budget, mainStat);
  const completeness = profileCompleteness({ level, weapon, goal, budget, mainStat });

  return (
    <main className="shell">
      <nav className="topNav" aria-label="Page navigation">
        <Link href="/">Dashboard</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/side-quests">Side Quests</Link>
        <Link href="/recommendations">Recommendations</Link>
        <span>Profile</span>
      </nav>

      <section className="explorerHero">
        <p className="eyebrow">Build Profile Planner</p>
        <h1>Make recommendations answer your character, not a generic player.</h1>
        <p className="lede">
          This lightweight profile is URL-based for the MVP. It shapes which helper pages you open next without
          adding accounts, persistence, or hidden state.
        </p>
      </section>

      <form className="profileForm">
        <label>
          <span>Player level</span>
          <input name="level" inputMode="numeric" defaultValue={String(level)} />
        </label>
        <label>
          <span>Weapon type</span>
          <select name="weapon" defaultValue={weapon}>
            {WEAPONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Main stat</span>
          <input name="main_stat" defaultValue={mainStat} placeholder="DEX, STR, INT" />
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
        <label>
          <span>Budget</span>
          <select name="budget" defaultValue={budget}>
            {BUDGETS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Update profile</button>
      </form>

      <PlannerContextBar
        title="Profile context"
        chips={[
          { label: "Level", value: `Lv ${level}`, tone: "good" },
          { label: "Weapon", value: weapon },
          { label: "Goal", value: GOALS.find((item) => item.value === goal)?.label ?? goal },
          { label: "Budget", value: BUDGETS.find((item) => item.value === budget)?.label ?? budget },
          { label: "Completeness", value: `${completeness.score}/5`, tone: completeness.score >= 5 ? "good" : "warn" },
        ]}
        state={{
          path: "/profile",
          label: "Profile planner",
          params: { level, weapon, goal, budget, main_stat: mainStat },
        }}
      />

      <section className="profileGrid">
        <article className="ledgerBlock statusCard">
          <p className="eyebrow">Current profile</p>
          <strong>Lv {level}</strong>
          <span>{weapon}</span>
          <small>
            {mainStat} / {BUDGETS.find((item) => item.value === budget)?.label}
          </small>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Contextual next actions</p>
            <h2>Open the right workflow</h2>
          </div>
          <div className="profileActionList">
            <ProfileAction
              title="Side Quest Helper"
              body="Use level and goal context to find efficient quests and required item objectives."
              href={href("/side-quests", { level, goal: sideQuestGoal })}
            />
            <ProfileAction
              title="Level Route Candidates"
              body="Find maps with monsters close to this level band for practical leveling."
              href={href("/recommendations", { level })}
            />
            <ProfileAction
              title="Farming Planner Lite"
              body="Rank NPC sell and quest-material targets without pretending drop routes exist yet."
              href={href("/farming", { level, goal: goal === "spina" ? "npc_sell" : "balanced" })}
            />
            <ProfileAction
              title="Gear And Material Search"
              body="Search the retrieval mart for weapon, stat, and budget-related terms."
              href={href("/search", { q: searchQuery })}
            />
          </div>
        </article>

        <article className="ledgerBlock">
          <div className="sectionHead">
            <p className="eyebrow">Profile readiness</p>
            <h2>{completeness.score >= 5 ? "Ready for route helpers" : "Add the missing assumptions"}</h2>
          </div>
          <div className="compactList">
            {completeness.notes.map((note) => (
              <div key={note}>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function ProfileAction({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Link className="profileAction" href={href}>
      <strong>{title}</strong>
      <span>{body}</span>
    </Link>
  );
}

function suggestedStat(weapon: string): string {
  if (weapon === "Staff" || weapon === "Magic Device") return "INT";
  if (weapon === "Katana" || weapon.includes("Sword") || weapon === "Halberd") return "STR";
  return "DEX";
}

function buildSearchQuery(weapon: string, budget: string, mainStat: string): string {
  const budgetTerm = budget === "low" ? "npc material" : budget === "medium" ? "crafted material" : "rare gear";
  return `${weapon} ${mainStat} ${budgetTerm}`;
}

function profileCompleteness({
  level,
  weapon,
  goal,
  budget,
  mainStat,
}: {
  level: number;
  weapon: string;
  goal: string;
  budget: string;
  mainStat: string;
}) {
  const notes: string[] = [];
  let score = 0;
  if (level > 1) {
    score += 1;
    notes.push(`Level set to Lv ${level}.`);
  } else {
    notes.push("Add a real level so route helpers can narrow the range.");
  }
  if (weapon) {
    score += 1;
    notes.push(`${weapon} selected for search context.`);
  }
  if (mainStat) {
    score += 1;
    notes.push(`${mainStat} is available for gear/material searches.`);
  }
  if (goal !== "balanced") {
    score += 1;
    notes.push("Goal is specific enough to bias helper links.");
  } else {
    notes.push("Choose a specific goal when you want less generic route leads.");
  }
  if (budget) {
    score += 1;
    notes.push(`${budget} budget keeps farming/search suggestions grounded.`);
  }
  notes.push("Profile state is saved in this browser and URL-based; no account is required.");
  return { score, notes };
}
