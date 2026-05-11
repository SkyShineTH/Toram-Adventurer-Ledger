import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchApi } from "../../api-client";

type Params = Promise<{ id: string }>;

type MapDetail = {
  id: number;
  name: string;
  source: string | null;
  verified_status: string | null;
  patch_version: string | null;
  monsters: Array<{ id: number; name: string; level: number | null; exp: number | null; element_label: string | null }>;
};

async function getMap(id: string): Promise<MapDetail> {
  const result = await fetchApi<MapDetail>(`/maps/${encodeURIComponent(id)}`);
  if (!result.ok) notFound();
  return result.data;
}

export default async function MapDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const gameMap = await getMap(id);

  return (
    <main className="shell">
      <nav className="topNav">
        <Link href="/">Dashboard</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/recommendations">Recommendations</Link>
        <span>Map</span>
      </nav>

      <section className="detailHero">
        <p className="eyebrow">Map #{gameMap.id}</p>
        <h1>{gameMap.name}</h1>
        <p className="lede">
          {gameMap.monsters.length.toLocaleString()} linked monster(s) in the validated ledger.
        </p>
      </section>

      <section className="detailGrid">
        <article className="ledgerBlock statusCard">
          <p className="eyebrow">Traceability</p>
          <strong>{gameMap.verified_status ?? "unknown"}</strong>
          <span>{gameMap.source ?? "unknown source"}</span>
          <small>Patch {gameMap.patch_version ?? "unknown"}</small>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Local monsters</p>
            <h2>What can spawn here</h2>
          </div>
          {gameMap.monsters.length > 0 ? (
            <div className="tableLike">
              {gameMap.monsters.slice(0, 40).map((monster) => (
                <div className="row" key={monster.id}>
                  <span>
                    <Link href={`/monsters/${monster.id}`}>{monster.name}</Link>
                  </span>
                  <span>Lv {monster.level ?? "?"} {monster.element_label ?? ""}</span>
                  <strong>{monster.exp?.toLocaleString() ?? "?"} EXP</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="emptyState">No monsters are linked to this map in the current dataset.</p>
          )}
        </article>
      </section>
    </main>
  );
}
