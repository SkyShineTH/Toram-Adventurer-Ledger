"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ContextChip = {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
};

type PlannerState = {
  path: string;
  label: string;
  params: Record<string, string | number | null | undefined>;
};

const STORAGE_KEY = "toram-ledger:last-planner-state";

function compactParams(params: PlannerState["params"]): Record<string, string> {
  const compacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const stringValue = String(value).trim();
    if (stringValue) compacted[key] = stringValue;
  }
  return compacted;
}

function hrefForState(state: PlannerState): string {
  const query = new URLSearchParams(compactParams(state.params));
  const serialized = query.toString();
  return serialized ? `${state.path}?${serialized}` : state.path;
}

export function PlannerContextBar({
  title = "Current assumptions",
  chips,
  state,
}: {
  title?: string;
  chips: ContextChip[];
  state?: PlannerState;
}) {
  return (
    <section className="contextBar" aria-label={title}>
      <div>
        <p className="eyebrow">{title}</p>
        <div className="contextChips">
          {chips.map((chip) => (
            <span className={`contextChip ${chip.tone ?? "default"}`} key={`${chip.label}:${chip.value}`}>
              <b>{chip.label}</b>
              {chip.value}
            </span>
          ))}
        </div>
      </div>
      {state ? <RememberPlannerState state={state} /> : null}
    </section>
  );
}

function RememberPlannerState({ state }: { state: PlannerState }) {
  const [savedHref, setSavedHref] = useState<string | null>(null);
  const currentHref = useMemo(() => hrefForState(state), [state]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PlannerState;
        const parsedHref = hrefForState(parsed);
        if (parsedHref !== currentHref) setSavedHref(parsedHref);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [currentHref, state]);

  return (
    <div className="plannerMemory">
      <span>Saved in this browser</span>
      {savedHref ? <Link href={savedHref}>Resume previous plan</Link> : <Link href={currentHref}>Copy route state</Link>}
    </div>
  );
}
