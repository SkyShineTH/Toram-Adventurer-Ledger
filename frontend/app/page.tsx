import Link from "next/link";
import type { CSSProperties } from "react";
import { PUBLIC_API_BASE_URL, fetchApi } from "./api-client";
import { ApiUnavailableNotice, LoaderRequiredNotice } from "./runtime-state";

type SmartSummary = {
  counts: Record<string, number>;
  validation: {
    passed: boolean;
    error_count: number;
    errors_by_code: Record<string, number>;
  };
  best_exp_quests: Array<{ id: number; title: string; level_required: number | null; exp_reward: number | null; npc_name: string | null }>;
  farm_value_candidates: Array<{ id: number; name: string; type_label: string | null; sell: number | null }>;
  monster_level_bands: Record<string, number>;
};

async function getSummary() {
  const result = await fetchApi<SmartSummary>("/dashboard/smart-play");
  return result.ok ? { data: result.data, error: null } : { data: null, error: result.message };
}

export default async function Home() {
  const { data: summary, error } = await getSummary();
  const counts = summary?.counts ?? {};
  const bands = Object.entries(summary?.monster_level_bands ?? {}).slice(-6);
  const hasLoadedData = Object.values(counts).some((count) => count > 0);
  const qualityLabel = summary ? `${summary.validation.error_count} visible finding(s)` : "API offline";

  return (
    <main className="shell">
      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Field ledger for returning adventurers</p>
          <h1>Choose a useful route before the session timer starts.</h1>
          <p className="lede">
            Inspect quests, farming targets, monster bands, and data confidence from one calm planning surface.
            The ledger points to good fits from validated local data without pretending every route is perfect.
          </p>
          <div className="actions">
            <Link href="/explorer" className="primaryLink">Open Explorer</Link>
            <Link href="/profile" className="ghostLink">Profile Planner</Link>
            <Link href="/farming" className="ghostLink">Farming</Link>
            <Link href="/side-quests" className="ghostLink">Side Quests</Link>
            <Link href="/recommendations" className="ghostLink">Recommendations</Link>
            <Link href="/search" className="ghostLink">Search</Link>
            <Link href="/quality" className="ghostLink">Data Quality</Link>
            <a href={`${PUBLIC_API_BASE_URL}/health`} className="ghostLink">API Health</a>
          </div>
        </div>
        <aside className="statusPanel routeSeal">
          <span className="stamp">Trust check</span>
          <strong>{qualityLabel}</strong>
          <p>
            {summary
              ? "Recommendations are grounded in loaded records and quality findings stay visible."
              : "Start the backend and loader before trusting planning results."}
          </p>
        </aside>
      </section>

      <section className="sessionPlanner" aria-label="Session planner shortcuts">
        <div>
          <p className="eyebrow">Plan a short session</p>
          <h2>What do you want to move forward?</h2>
        </div>
        <div className="plannerChoices">
          <Link href="/recommendations?level=70">
            <span>45 min</span>
            <strong>Leveling route</strong>
            <small>Maps and quest leads near Lv 70</small>
          </Link>
          <Link href="/farming?goal=quest_material&level=70">
            <span>30 min</span>
            <strong>Quest materials</strong>
            <small>Targets with linked quest usage</small>
          </Link>
          <Link href="/side-quests?level=70&goal=exp">
            <span>60 min</span>
            <strong>Side quest EXP</strong>
            <small>Good fit, not absolute best</small>
          </Link>
        </div>
      </section>

      <section className="metricRow" aria-label="Dataset counts">
        {["items", "maps", "monsters", "quests", "quest_objectives"].map((key) => (
          <div className="metric" key={key}>
            <span>{key.replace("_", " ")}</span>
            <strong>{counts[key]?.toLocaleString() ?? "-"}</strong>
          </div>
        ))}
      </section>

      {error ? <ApiUnavailableNotice message={error} /> : null}
      {summary && !hasLoadedData ? <LoaderRequiredNotice /> : null}

      <section className="dashboardGrid">
        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Route leads</p>
            <h2>Quest options worth checking</h2>
          </div>
          <div className="routeList">
            {(summary?.best_exp_quests ?? []).slice(0, 6).map((quest) => (
              <Link className="routeCard compactRoute" href={`/quests/${quest.id}`} key={quest.id}>
                <div>
                  <strong>{quest.title}</strong>
                  <span>Lv {quest.level_required ?? "?"} / {quest.npc_name ?? "NPC unknown"}</span>
                </div>
                <small>{quest.exp_reward?.toLocaleString() ?? "?"} EXP reward</small>
              </Link>
            ))}
          </div>
        </article>

        <article className="ledgerBlock">
          <div className="sectionHead">
            <p className="eyebrow">Level route map</p>
            <h2>Monster bands</h2>
          </div>
          <div className="bandList">
            {bands.map(([band, value]) => (
              <div className="band" key={band}>
                <span>{band}</span>
                <i style={{ "--w": `${Math.min(100, value / 5)}%` } as CSSProperties} />
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="ledgerBlock">
          <div className="sectionHead">
            <p className="eyebrow">Farming baseline</p>
            <h2>Sell value candidates</h2>
          </div>
          <div className="compactList">
            {(summary?.farm_value_candidates ?? []).slice(0, 6).map((item) => (
              <div key={item.id}>
                <span>{item.name}</span>
                <strong>{item.sell?.toLocaleString() ?? "?"} spina</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
