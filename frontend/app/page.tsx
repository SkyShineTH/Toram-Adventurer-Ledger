import Link from "next/link";
import type { CSSProperties } from "react";
import { PUBLIC_API_BASE_URL, fetchApi } from "./api-client";

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

async function getSummary(): Promise<SmartSummary | null> {
  const result = await fetchApi<SmartSummary>("/dashboard/smart-play");
  return result.ok ? result.data : null;
}

export default async function Home() {
  const summary = await getSummary();
  const counts = summary?.counts ?? {};
  const bands = Object.entries(summary?.monster_level_bands ?? {}).slice(-6);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Toram Adventurer Ledger</p>
          <h1>Plan the next route before you spend the next hour.</h1>
          <p className="lede">
            A calm, data-backed ledger for returning players: inspect quests, trace item relationships,
            and spot efficient Smart Play opportunities from validated Coryn-derived data.
          </p>
          <div className="actions">
            <Link href="/explorer" className="primaryLink">Open Explorer</Link>
            <Link href="/profile" className="ghostLink">Profile Planner</Link>
            <Link href="/side-quests" className="ghostLink">Side Quests</Link>
            <Link href="/recommendations" className="ghostLink">Recommendations</Link>
            <Link href="/search" className="ghostLink">Search</Link>
            <Link href="/quality" className="ghostLink">Data Quality</Link>
            <a href={`${PUBLIC_API_BASE_URL}/health`} className="ghostLink">API Health</a>
          </div>
        </div>
        <aside className="statusPanel">
          <span className="stamp">Data quality</span>
          <strong>{summary ? `${summary.validation.error_count} findings` : "API offline"}</strong>
          <p>{summary ? "Validation is wired into the pipeline. Remaining findings are visible, not hidden." : "Run the backend and ETL to populate the dashboard."}</p>
        </aside>
      </section>

      <section className="metricRow" aria-label="Dataset counts">
        {["items", "maps", "monsters", "quests", "quest_objectives"].map((key) => (
          <div className="metric" key={key}>
            <span>{key.replace("_", " ")}</span>
            <strong>{counts[key]?.toLocaleString() ?? "-"}</strong>
          </div>
        ))}
      </section>

      <section className="dashboardGrid">
        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Side quest helper</p>
            <h2>Highest EXP quest leads</h2>
          </div>
          <div className="tableLike">
            {(summary?.best_exp_quests ?? []).slice(0, 6).map((quest) => (
              <div className="row" key={quest.id}>
                <span>{quest.title}</span>
                <span>Lv {quest.level_required ?? "?"}</span>
                <strong>{quest.exp_reward?.toLocaleString() ?? "?"} EXP</strong>
              </div>
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
            <h2>NPC value candidates</h2>
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
