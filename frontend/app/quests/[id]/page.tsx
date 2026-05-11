import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchApi } from "../../api-client";

type Params = Promise<{ id: string }>;

type QuestDetail = {
  id: number;
  title: string;
  type: string | null;
  level_required: number | null;
  exp_reward: number | null;
  npc_name: string | null;
  source: string | null;
  verified_status: string | null;
  patch_version: string | null;
  objectives: Array<{ id: string; text: string | null; target_item_id: number | null; target_item_name: string | null }>;
};

async function getQuest(id: string): Promise<QuestDetail> {
  const result = await fetchApi<QuestDetail>(`/quests/${encodeURIComponent(id)}`);
  if (!result.ok) notFound();
  return result.data;
}

export default async function QuestDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const quest = await getQuest(id);

  return (
    <main className="shell">
      <nav className="topNav">
        <Link href="/">Dashboard</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/side-quests">Side Quests</Link>
        <span>Quest</span>
      </nav>

      <section className="detailHero">
        <p className="eyebrow">Quest #{quest.id}</p>
        <h1>{quest.title}</h1>
        <p className="lede">
          {quest.type ?? "Quest"} / Lv {quest.level_required ?? "?"} / {quest.exp_reward?.toLocaleString() ?? "?"} EXP
        </p>
      </section>

      <section className="detailGrid">
        <article className="ledgerBlock statusCard">
          <p className="eyebrow">NPC handoff</p>
          <strong>{quest.npc_name ?? "Unknown"}</strong>
          <span>{quest.verified_status ?? "unknown"} data</span>
          <small>Patch {quest.patch_version ?? "unknown"}</small>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Objectives</p>
            <h2>What to prepare</h2>
          </div>
          {quest.objectives.length > 0 ? (
            <div className="questCardList">
              {quest.objectives.map((objective) => (
                <section className="questCard" key={objective.id}>
                  <div className="questCardHeader">
                    <div>
                      <strong>{objective.text ?? "Objective details unavailable"}</strong>
                      <span>{objective.target_item_name ?? "No linked item"}</span>
                    </div>
                    {objective.target_item_id ? <Link href={`/items/${objective.target_item_id}`}>Open item</Link> : null}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="emptyState">No objective rows found for this quest.</p>
          )}
        </article>
      </section>
    </main>
  );
}
