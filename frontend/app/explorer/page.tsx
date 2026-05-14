import Link from "next/link";
import type { ReactNode } from "react";
import { type ApiList, fetchApi } from "../api-client";
import { entityHref } from "../entity-links";
import { ApiUnavailableNotice, LoaderRequiredNotice } from "../runtime-state";

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

function parseOffset(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, parsed);
}

function explorerHref(
  currentParams: Record<string, string | string[] | undefined>,
  offsetKey: string,
  offset: number,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams)) {
    const stringValue = firstValue(value).trim();
    if (stringValue) query.set(key, stringValue);
  }
  if (offset > 0) {
    query.set(offsetKey, String(offset));
  } else {
    query.delete(offsetKey);
  }
  const serialized = query.toString();
  return serialized ? `/explorer?${serialized}` : "/explorer";
}

type ListResult<T> = {
  data: ApiList<T>;
  error: string | null;
};

async function fetchList<T>(path: string): Promise<ListResult<T>> {
  const result = await fetchApi<ApiList<T>>(path);
  return result.ok
    ? { data: result.data, error: null }
    : { data: { total: 0, limit: LIMIT, offset: 0, items: [] }, error: result.message };
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
  const itemOffset = parseOffset(firstValue(params.item_offset));
  const monsterOffset = parseOffset(firstValue(params.monster_offset));
  const questOffset = parseOffset(firstValue(params.quest_offset));

  const [itemResult, monsterResult, questResult] = await Promise.all([
    fetchList<Item>(endpoint("/items", { q: itemQ, type_label: itemType, offset: String(itemOffset) })),
    fetchList<Monster>(
      endpoint("/monsters", {
        q: monsterQ,
        element_label: monsterElement,
        min_level: monsterMinLevel,
        max_level: monsterMaxLevel,
        offset: String(monsterOffset),
      }),
    ),
    fetchList<Quest>(
      endpoint("/quests", { q: questQ, npc_name: questNpc, min_exp: questMinExp, offset: String(questOffset) }),
    ),
  ]);
  const items = itemResult.data;
  const monsters = monsterResult.data;
  const quests = questResult.data;
  const errors = [itemResult.error, monsterResult.error, questResult.error].filter((message): message is string =>
    Boolean(message),
  );
  const hasLoadedData = items.total + monsters.total + quests.total > 0;

  return (
    <main className="shell">
      <nav className="topNav" aria-label="Page navigation">
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
      {errors.length > 0 ? <ApiUnavailableNotice message={errors[0]} /> : null}
      {errors.length === 0 && !hasLoadedData ? <LoaderRequiredNotice /> : null}
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
          pagination={{
            list: items,
            previousHref: explorerHref(params, "item_offset", Math.max(0, items.offset - items.limit)),
            nextHref: explorerHref(params, "item_offset", items.offset + items.limit),
          }}
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
          pagination={{
            list: monsters,
            previousHref: explorerHref(params, "monster_offset", Math.max(0, monsters.offset - monsters.limit)),
            nextHref: explorerHref(params, "monster_offset", monsters.offset + monsters.limit),
          }}
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
          pagination={{
            list: quests,
            previousHref: explorerHref(params, "quest_offset", Math.max(0, quests.offset - quests.limit)),
            nextHref: explorerHref(params, "quest_offset", quests.offset + quests.limit),
          }}
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
  pagination,
}: {
  title: string;
  total: number;
  form: ReactNode;
  rows: Array<[string, string, string, string | null]>;
  pagination: {
    list: ApiList<unknown>;
    previousHref: string;
    nextHref: string;
  };
}) {
  const currentStart = total === 0 ? 0 : pagination.list.offset + 1;
  const currentEnd = Math.min(total, pagination.list.offset + pagination.list.items.length);
  const hasPrevious = pagination.list.offset > 0;
  const hasNext = pagination.list.offset + pagination.list.limit < total;

  return (
    <article className="ledgerBlock">
      <div className="sectionHead">
        <p className="eyebrow">
          {total.toLocaleString()} matched records / showing {currentStart.toLocaleString()}-{currentEnd.toLocaleString()}
        </p>
        <h2>{title}</h2>
      </div>
      {form}
      <div className="tableLike tight" role="list">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div className="row" role="listitem" key={row.join(":")}>
              <span>{row[3] ? <Link href={row[3]}>{row[0]}</Link> : row[0]}</span>
              <span>{row[1]}</span>
              <strong>{row[2]}</strong>
            </div>
          ))
        ) : (
          <p className="emptyState">No records matched this filter set.</p>
        )}
      </div>
      <nav className="pager" aria-label={`${title} pagination`}>
        {hasPrevious ? <Link href={pagination.previousHref}>Previous</Link> : <span>Previous</span>}
        <small>
          Page {Math.floor(pagination.list.offset / pagination.list.limit) + 1} of{" "}
          {Math.max(1, Math.ceil(total / pagination.list.limit))}
        </small>
        {hasNext ? <Link href={pagination.nextHref}>Next</Link> : <span>Next</span>}
      </nav>
    </article>
  );
}
