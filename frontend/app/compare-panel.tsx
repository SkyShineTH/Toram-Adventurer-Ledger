"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type CompareItem = {
  id: string;
  title: string;
  href?: string;
  meta: string;
  facts: Array<{ label: string; value: string }>;
};

export function ComparePanel({ items, label }: { items: CompareItem[]; label: string }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)).slice(0, 4),
    [items, selectedIds],
  );

  function toggle(id: string): void {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="comparePanel" aria-label={`${label} comparison`}>
      <div className="sectionHead">
        <p className="eyebrow">Compare options</p>
        <h2>{selectedItems.length ? `${selectedItems.length} selected` : "Choose up to four"}</h2>
      </div>
      <div className="comparePicker" role="list">
        {items.map((item) => {
          const checked = selectedIds.includes(item.id);
          const disabled = !checked && selectedIds.length >= 4;
          return (
            <label className="compareToggle" key={item.id} role="listitem">
              <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(item.id)} />
              <span>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </span>
            </label>
          );
        })}
      </div>
      {selectedItems.length > 0 ? (
        <div className="compareGrid">
          {selectedItems.map((item) => (
            <article className="compareCard" key={item.id}>
              <strong>{item.href ? <Link href={item.href}>{item.title}</Link> : item.title}</strong>
              <span>{item.meta}</span>
              <dl>
                {item.facts.map((fact) => (
                  <div key={`${item.id}:${fact.label}`}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <p className="emptyState">Select candidates to compare rewards, requirements, and route friction.</p>
      )}
    </section>
  );
}
