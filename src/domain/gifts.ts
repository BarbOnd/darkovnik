import type { Gift } from "./entities";

/** Active = NEW or BOUGHT (PRODUCT.md §8 "Aktivní"). */
export function isActiveGift(gift: Pick<Gift, "status">): boolean {
  return gift.status === "NEW" || gift.status === "BOUGHT";
}

/**
 * A gift with the same name (trimmed, case-insensitive, cs-CZ) that one of the
 * recipients already has, so quick add can warn about a duplicate (PRODUCT.md §11).
 * Recipients are checked in the given order; an empty name matches nothing.
 */
export function findSimilarGift<T extends Pick<Gift, "personId" | "name">>(
  gifts: readonly T[],
  personIds: readonly number[],
  name: string,
): T | undefined {
  const wanted = name.trim().toLocaleLowerCase("cs-CZ");
  if (wanted === "") return undefined;
  for (const personId of personIds) {
    const match = gifts.find(
      (gift) => gift.personId === personId && gift.name.trim().toLocaleLowerCase("cs-CZ") === wanted,
    );
    if (match !== undefined) return match;
  }
  return undefined;
}

/** Number of active gifts per recipient; people without gifts are absent from the map. */
export function countActiveGiftsByPerson(gifts: readonly Pick<Gift, "personId" | "status">[]): Map<number, number> {
  const counts = new Map<number, number>();
  gifts.filter(isActiveGift).forEach((gift) => {
    counts.set(gift.personId, (counts.get(gift.personId) ?? 0) + 1);
  });
  return counts;
}
