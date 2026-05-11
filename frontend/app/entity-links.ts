export function entityHref(entityType: string, entityId: string | number): string | null {
  const id = encodeURIComponent(String(entityId));
  if (entityType === "item") return `/items/${id}`;
  if (entityType === "monster") return `/monsters/${id}`;
  if (entityType === "quest") return `/quests/${id}`;
  if (entityType === "map") return `/maps/${id}`;
  return null;
}
