import type { Gift, GiftPriority, GiftSortMode, PeopleSortMode, Person } from "./entities";

const PRIORITY_RANK: Record<GiftPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export function comparePeopleByName(a: Pick<Person, "id" | "name">, b: Pick<Person, "id" | "name">): number {
  return a.name.localeCompare(b.name, "cs-CZ") || a.id - b.id;
}

/** HIGH → MEDIUM → LOW, then newest first, ties by id. */
export function compareGiftsByPriority(
  a: Pick<Gift, "id" | "priority" | "createdAt">,
  b: Pick<Gift, "id" | "priority" | "createdAt">,
): number {
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id - b.id;
}

export function compareBySortOrder(
  a: { id: number; sortOrder: number },
  b: { id: number; sortOrder: number },
): number {
  return a.sortOrder - b.sortOrder || a.id - b.id;
}

export function sortPeople<T extends Person>(people: readonly T[], mode: PeopleSortMode): T[] {
  return [...people].sort(mode === "MANUAL" ? compareBySortOrder : comparePeopleByName);
}

export function sortGifts<T extends Gift>(gifts: readonly T[], mode: GiftSortMode): T[] {
  return [...gifts].sort(mode === "MANUAL" ? compareBySortOrder : compareGiftsByPriority);
}
