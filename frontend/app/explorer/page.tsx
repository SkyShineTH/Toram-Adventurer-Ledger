import Link from "next/link";
import { type ApiList, fetchApi } from "../../lib/api";

type Item = { id: number; name: string; type_label: string | null; sell: number | null };
type Monster = { id: number; name: string; level: number | null; map_name: string | null; element_label: string | null; exp: number | null };
type Quest = { id: number; title: string; level_required: number | null; exp_reward: number | null; npc_name: string | null };

async function fetchList<T>(path: string): Promise<ApiList<T>> {
  const result = await fetchApi<ApiList<T>>(path);
  return result.ok ? result.data : { total: 0, limit: 0, offset: 0, items: [] };
}

export default async function Explorer() {
  const [items, monsters, quests] = await Promise.all([
    fetchList<Item>("/items?limit=8"),
    fetchList<Monster>("/monsters?limit=8"),
    fetchList<Quest>("/quests?limit=8")
  ]);

  return (
    <main className="shell">
      <nav className="topNav">
        <Link href="/">Dashboard</Link>
        <span>Explorer</span>
      </nav>
      <section className="explorerHero">
        <p className="eyebrow">Relationship explorer</p>
        <h1>Open the ledger, then follow the thread.</h1>
        <p className="lede">Browse the first file-backed API slice. Search/filter controls will build on these endpoint contracts.</p>
      </section>
      <section className="tripleGrid">
        <ExplorerColumn title="Items" total={items.total} rows={items.items.map((item) => [item.name, item.type_label ?? "unknown", item.sell ? `${item.sell} spina` : "no sell"])} />
        <ExplorerColumn title="Monsters" total={monsters.total} rows={monsters.items.map((monster) => [monster.name, `Lv ${monster.level ?? "?"}`, monster.map_name ?? "unknown map"])} />
        <ExplorerColumn title="Quests" total={quests.total} rows={quests.items.map((quest) => [quest.title, `Lv ${quest.level_required ?? "?"}`, `${quest.exp_reward?.toLocaleString() ?? "?"} EXP`])} />
      </section>
    </main>
  );
}

function ExplorerColumn({ title, total, rows }: { title: string; total: number; rows: string[][] }) {
  return (
    <article className="ledgerBlock">
      <div className="sectionHead">
        <p className="eyebrow">{total.toLocaleString()} records</p>
        <h2>{title}</h2>
      </div>
      <div className="tableLike tight">
        {rows.map((row) => (
          <div className="row" key={row.join(":")}>
            <span>{row[0]}</span>
            <span>{row[1]}</span>
            <strong>{row[2]}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
