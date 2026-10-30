import type { Gift, GiftPriority, GiftSortMode, PeopleSortMode, Person } from "./entities";

const PRIORITY_RANK: Record<GiftPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export function comparePeopleByName(a: Pick<Person, "id" | "name">, b: Pick<Person, "id" | "name">): number {
  return a.name.localeCompare(b.name, "cs-CZ") || a.id - b.id;
}

/** Tags are listed by name the same way as people (cs-CZ, ties by id). */
export const compareTagsByName = comparePeopleByName;

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

/** Moves given gifts to the end of the list, keeping the order within both groups. */
export function givenLast<T extends Pick<Gift, "status">>(gifts: readonly T[]): T[] {
  return [...gifts.filter((gift) => gift.status !== "GIVEN"), ...gifts.filter((gift) => gift.status === "GIVEN")];
}

/**
 * New full manual order after the user reordered only the visible subset:
 * visible items take the slots visible items had, hidden items keep theirs.
 * Example: full [a, H, b, c], visible reordered to [c, a, b] → [c, H, a, b].
 */
export function reorderSubset(fullOrder: readonly number[], visibleInNewOrder: readonly number[]): number[] {
  const visible = new Set(visibleInNewOrder);
  let next = 0;
  return fullOrder.map((id) => (visible.has(id) ? visibleInNewOrder[next++] : id));
}

export function sortPeople<T extends Person>(people: readonly T[], mode: PeopleSortMode): T[] {
  return [...people].sort(mode === "MANUAL" ? compareBySortOrder : comparePeopleByName);
}

export function sortGifts<T extends Gift>(gifts: readonly T[], mode: GiftSortMode): T[] {
  return [...gifts].sort(mode === "MANUAL" ? compareBySortOrder : compareGiftsByPriority);
}
