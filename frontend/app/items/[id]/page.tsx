import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchApi } from "../../api-client";

type Params = Promise<{ id: string }>;

type ItemDetail = {
  id: number;
  name: string;
  type_label: string | null;
  sell: number | null;
  process: number | null;
  process_amount: number | null;
  note: string | null;
  source: string | null;
  verified_status: string | null;
  patch_version: string | null;
  related_quests: Array<{ id: number; title: string; level_required: number | null; exp_reward: number | null; npc_name: string | null }>;
  related_objectives: Array<{ quest_id: number; text: string | null; target_item_name: string | null }>;
};

async function getItem(id: string): Promise<ItemDetail> {
  const result = await fetchApi<ItemDetail>(`/items/${encodeURIComponent(id)}`);
  if (!result.ok) notFound();
  return result.data;
}

export default async function ItemDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const item = await getItem(id);

  return (
    <main className="shell">
      <nav className="topNav" aria-label="Page navigation">
        <Link href="/">Dashboard</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/search">Search</Link>
        <span>Item</span>
      </nav>

      <section className="detailHero">
        <p className="eyebrow">Item #{item.id}</p>
        <h1>{item.name}</h1>
        <p className="lede">
          {item.type_label ?? "Unknown type"} / {item.sell?.toLocaleString() ?? "No"} NPC sell value
        </p>
      </section>

      <section className="detailGrid">
        <article className="ledgerBlock statusCard">
          <p className="eyebrow">Traceability</p>
          <strong>{item.verified_status ?? "unknown"}</strong>
          <span>{item.source ?? "unknown source"}</span>
          <small>Patch {item.patch_version ?? "unknown"}</small>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Quest relationships</p>
            <h2>Where this item appears</h2>
          </div>
          {item.related_quests.length > 0 ? (
            <div className="tableLike">
              {item.related_quests.map((quest) => (
                <div className="row" key={quest.id}>
                  <span>
                    <Link href={`/quests/${quest.id}`}>{quest.title}</Link>
                  </span>
                  <span>Lv {quest.level_required ?? "?"}</span>
                  <strong>{quest.exp_reward?.toLocaleString() ?? "?"} EXP</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="emptyState">No linked quest objective in the current dataset.</p>
          )}
        </article>

        <article className="ledgerBlock">
          <div className="sectionHead">
            <p className="eyebrow">Processing</p>
            <h2>Material baseline</h2>
          </div>
          <div className="compactList">
            <div>
              <span>Process value</span>
              <strong>{item.process?.toLocaleString() ?? "-"}</strong>
            </div>
            <div>
              <span>Process amount</span>
              <strong>{item.process_amount?.toLocaleString() ?? "-"}</strong>
            </div>
          </div>
          <p className="lede detailNote">{item.note || "No item note available."}</p>
        </article>
      </section>
    </main>
  );
}
