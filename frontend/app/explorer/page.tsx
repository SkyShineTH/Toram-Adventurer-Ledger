import Link from "next/link";
import type { ReactNode } from "react";
import { type ApiList, fetchApi } from "../api-client";
import { entityHref } from "../entity-links";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Item = { id: number; name: string; type_label: string | null; sell: number | null };
type Monster = {
  id: number;
  name: string;
  level: number | null;
  map_name: string | null;
  element_label: string | null;
  exp: number | null;
  type_label: string | null;
};
type Quest = {
  id: number;
  title: string;
  type: string | null;
  level_required: number | null;
  exp_reward: number | null;
  npc_name: string | null;
};

const LIMIT = 12;

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function appendIfPresent(params: URLSearchParams, key: string, value: string): void {
  const trimmed = value.trim();
  if (trimmed) params.set(key, trimmed);
}

function endpoint(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams({ limit: String(LIMIT) });
  for (const [key, value] of Object.entries(params)) {
    appendIfPresent(query, key, value);
  }
  return `${path}?${query.toString()}`;
}

async function fetchList<T>(path: string): Promise<ApiList<T>> {
  const result = await fetchApi<ApiList<T>>(path);
  return result.ok ? result.data : { total: 0, limit: LIMIT, offset: 0, items: [] };
}

export default async function Explorer({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const itemQ = firstValue(params.item_q);
  const itemType = firstValue(params.item_type);
  const monsterQ = firstValue(params.monster_q);
  const monsterElement = firstValue(params.monster_element);
  const monsterMinLevel = firstValue(params.monster_min_level);
  const monsterMaxLevel = firstValue(params.monster_max_level);
  const questQ = firstValue(params.quest_q);
  const questNpc = firstValue(params.quest_npc);
  const questMinExp = firstValue(params.quest_min_exp);

  const [items, monsters, quests] = await Promise.all([
    fetchList<Item>(endpoint("/items", { q: itemQ, type_label: itemType })),
    fetchList<Monster>(
      endpoint("/monsters", {
        q: monsterQ,
        element_label: monsterElement,
        min_level: monsterMinLevel,
        max_level: monsterMaxLevel,
      }),
    ),
    fetchList<Quest>(endpoint("/quests", { q: questQ, npc_name: questNpc, min_exp: questMinExp })),
  ]);

  return (
    <main className="shell">
      <nav className="topNav">
        <Link href="/">Dashboard</Link>
        <span>Explorer</span>
      </nav>
      <section className="explorerHero">
        <p className="eyebrow">Relationship explorer</p>
        <h1>Search the ledger before you choose the route.</h1>
        <p className="lede">
          Server-rendered search and filters backed by the FastAPI endpoint contracts. Keep the raw cache local,
          but make validated relationships visible.
        </p>
      </section>
      <section className="tripleGrid">
        <ExplorerColumn
          title="Items"
          total={items.total}
          form={
            <FilterForm
              fields={[
                { label: "Item search", name: "item_q", value: itemQ, placeholder: "Ghostfire, cloth, xtal" },
                { label: "Type", name: "item_type", value: itemType, placeholder: "[Material]" },
              ]}
            />
          }
          rows={items.items.map((item) => [
            item.name,
            item.type_label ?? "unknown type",
            item.sell ? `${item.sell.toLocaleString()} spina` : "no sell",
            entityHref("item", item.id),
          ])}
        />
        <ExplorerColumn
          title="Monsters"
          total={monsters.total}
          form={
            <FilterForm
              fields={[
                { label: "Monster search", name: "monster_q", value: monsterQ, placeholder: "Boss, Sakura" },
                { label: "Element", name: "monster_element", value: monsterElement, placeholder: "Wind" },
                { label: "Min level", name: "monster_min_level", value: monsterMinLevel, placeholder: "50" },
                { label: "Max level", name: "monster_max_level", value: monsterMaxLevel, placeholder: "120" },
              ]}
            />
          }
          rows={monsters.items.map((monster) => [
            monster.name,
            `Lv ${monster.level ?? "?"} ${monster.element_label ?? ""}`.trim(),
            monster.map_name ?? "unknown map",
            entityHref("monster", monster.id),
          ])}
        />
        <ExplorerColumn
          title="Quests"
          total={quests.total}
          form={
            <FilterForm
              fields={[
                { label: "Quest search", name: "quest_q", value: questQ, placeholder: "working, iron" },
                { label: "NPC", name: "quest_npc", value: questNpc, placeholder: "Yunis" },
                { label: "Min EXP", name: "quest_min_exp", value: questMinExp, placeholder: "50000" },
              ]}
            />
          }
          rows={quests.items.map((quest) => [
            quest.title,
            `${quest.type ?? "Quest"} Lv ${quest.level_required ?? "?"}`,
            `${quest.exp_reward?.toLocaleString() ?? "?"} EXP`,
            entityHref("quest", quest.id),
          ])}
        />
      </section>
    </main>
  );
}

function FilterForm({
  fields,
}: {
  fields: Array<{ label: string; name: string; value: string; placeholder: string }>;
}) {
  return (
    <form className="filterForm">
      {fields.map((field) => (
        <label key={field.name}>
          <span>{field.label}</span>
          <input name={field.name} defaultValue={field.value} placeholder={field.placeholder} />
        </label>
      ))}
      <div className="filterActions">
        <button type="submit">Search</button>
        <Link href="/explorer">Clear</Link>
      </div>
    </form>
  );
}

function ExplorerColumn({
  title,
  total,
  form,
  rows,
}: {
  title: string;
  total: number;
  form: ReactNode;
  rows: Array<[string, string, string, string | null]>;
}) {
  return (
    <article className="ledgerBlock">
      <div className="sectionHead">
        <p className="eyebrow">{total.toLocaleString()} matched records</p>
        <h2>{title}</h2>
      </div>
      {form}
      <div className="tableLike tight">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div className="row" key={row.join(":")}>
              <span>{row[3] ? <Link href={row[3]}>{row[0]}</Link> : row[0]}</span>
              <span>{row[1]}</span>
              <strong>{row[2]}</strong>
            </div>
          ))
        ) : (
          <p className="emptyState">No records matched this filter set.</p>
        )}
      </div>
    </article>
  );
}
