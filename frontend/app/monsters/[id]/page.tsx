import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchApi } from "../../api-client";

type Params = Promise<{ id: string }>;

type MonsterDetail = {
  id: number;
  name: string;
  level: number | null;
  map_id: number | null;
  map_name: string | null;
  type_label: string | null;
  element_label: string | null;
  hp: number | null;
  exp: number | null;
  tameable: boolean | null;
  limited: boolean | null;
  note: string | null;
  verified_status: string | null;
  patch_version: string | null;
};

async function getMonster(id: string): Promise<MonsterDetail> {
  const result = await fetchApi<MonsterDetail>(`/monsters/${encodeURIComponent(id)}`);
  if (!result.ok) notFound();
  return result.data;
}

export default async function MonsterDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const monster = await getMonster(id);

  return (
    <main className="shell">
      <nav className="topNav" aria-label="Page navigation">
        <Link href="/">Dashboard</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/recommendations">Recommendations</Link>
        <span>Monster</span>
      </nav>

      <section className="detailHero">
        <p className="eyebrow">Monster #{monster.id}</p>
        <h1>{monster.name}</h1>
        <p className="lede">
          Lv {monster.level ?? "?"} / {monster.element_label ?? "Unknown element"} / {monster.type_label ?? "Unknown type"}
        </p>
      </section>

      <section className="detailGrid">
        <article className="ledgerBlock statusCard">
          <p className="eyebrow">Route context</p>
          <strong>{monster.map_name ?? "Unknown map"}</strong>
          {monster.map_id ? <Link href={`/maps/${monster.map_id}`}>Open map</Link> : <span>No linked map</span>}
          <small>Patch {monster.patch_version ?? "unknown"}</small>
        </article>

        <article className="ledgerBlock wide">
          <div className="sectionHead">
            <p className="eyebrow">Combat baseline</p>
            <h2>Known stats</h2>
          </div>
          <div className="metricRow detailMetrics">
            <div className="metric">
              <span>HP</span>
              <strong>{monster.hp?.toLocaleString() ?? "-"}</strong>
            </div>
            <div className="metric">
              <span>EXP</span>
              <strong>{monster.exp?.toLocaleString() ?? "-"}</strong>
            </div>
            <div className="metric">
              <span>Tameable</span>
              <strong>{monster.tameable ? "Yes" : "No"}</strong>
            </div>
          </div>
          <p className="lede detailNote">{monster.note || "No monster note available."}</p>
        </article>
      </section>
    </main>
  );
}
