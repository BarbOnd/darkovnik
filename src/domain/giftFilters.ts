import type { Gift } from "./entities";

/** Status filter on the person detail (PRODUCT.md §8); exactly one is selected. */
export const STATUS_FILTERS = ["ACTIVE", "BOUGHT", "GIVEN", "ALL"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export type GiftFilter = {
  status: StatusFilter;
  /** A gift must have all of these tags. */
  tagIds: number[];
};

export const DEFAULT_GIFT_FILTER: GiftFilter = { status: "ACTIVE", tagIds: [] };

export function matchesStatus(gift: Pick<Gift, "status">, status: StatusFilter): boolean {
  switch (status) {
    case "ACTIVE":
      return gift.status === "NEW" || gift.status === "BOUGHT";
    case "BOUGHT":
      return gift.status === "BOUGHT";
    case "GIVEN":
      return gift.status === "GIVEN";
    case "ALL":
      return true;
  }
}

/** Status AND all selected tags. `tagIdsByGift` maps a gift ID to its tag IDs. */
export function filterGifts<T extends Pick<Gift, "id" | "status">>(
  gifts: readonly T[],
  tagIdsByGift: ReadonlyMap<number, ReadonlySet<number>>,
  filter: GiftFilter,
): T[] {
  return gifts.filter((gift) => {
    if (!matchesStatus(gift, filter.status)) return false;
    const tags = tagIdsByGift.get(gift.id);
    return filter.tagIds.every((tagId) => tags?.has(tagId) === true);
  });
}

export function isDefaultFilter(filter: GiftFilter): boolean {
  return filter.status === DEFAULT_GIFT_FILTER.status && filter.tagIds.length === 0;
}

/**
 * Manual reordering is offered only when the user sees what they move:
 * "Vše", or "Aktivní" without tags (PRODUCT.md §9).
 */
export function canReorderWithFilter(filter: GiftFilter): boolean {
  return filter.tagIds.length === 0 && (filter.status === "ALL" || filter.status === "ACTIVE");
}
