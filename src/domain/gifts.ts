import type { Gift } from "./entities";

/** Active = NEW or BOUGHT (PRODUCT.md §8 "Aktivní"). */
export function isActiveGift(gift: Pick<Gift, "status">): boolean {
  return gift.status === "NEW" || gift.status === "BOUGHT";
}

/** Number of active gifts per recipient; people without gifts are absent from the map. */
export function countActiveGiftsByPerson(gifts: readonly Pick<Gift, "personId" | "status">[]): Map<number, number> {
  const counts = new Map<number, number>();
  gifts.filter(isActiveGift).forEach((gift) => {
    counts.set(gift.personId, (counts.get(gift.personId) ?? 0) + 1);
  });
  return counts;
}
