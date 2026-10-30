import { describe, expect, it } from "vitest";
import type { GiftStatus } from "./entities";
import {
  canReorderWithFilter,
  DEFAULT_GIFT_FILTER,
  filterGifts,
  isDefaultFilter,
  type GiftFilter,
} from "./giftFilters";

const CHRISTMAS = 1;
const BIRTHDAY = 2;

const gifts: { id: number; status: GiftStatus }[] = [
  { id: 1, status: "NEW" },
  { id: 2, status: "BOUGHT" },
  { id: 3, status: "GIVEN" },
  { id: 4, status: "NEW" },
  { id: 5, status: "BOUGHT" },
];

const tags = new Map<number, Set<number>>([
  [1, new Set([CHRISTMAS])],
  [2, new Set([CHRISTMAS, BIRTHDAY])],
  [3, new Set([CHRISTMAS])],
  [5, new Set([BIRTHDAY])],
]);

function ids(filter: GiftFilter) {
  return filterGifts(gifts, tags, filter).map((gift) => gift.id);
}

describe("gift filters", () => {
  it.each([
    [{ status: "ACTIVE", tagIds: [] }, [1, 2, 4, 5]],
    [{ status: "BOUGHT", tagIds: [] }, [2, 5]],
    [{ status: "GIVEN", tagIds: [] }, [3]],
    [{ status: "ALL", tagIds: [] }, [1, 2, 3, 4, 5]],
    // Aktivní + Vánoce
    [{ status: "ACTIVE", tagIds: [CHRISTMAS] }, [1, 2]],
    // Koupeno + Vánoce
    [{ status: "BOUGHT", tagIds: [CHRISTMAS] }, [2]],
    // Aktivní + Vánoce + Narozeniny: both tags required
    [{ status: "ACTIVE", tagIds: [CHRISTMAS, BIRTHDAY] }, [2]],
    [{ status: "GIVEN", tagIds: [BIRTHDAY] }, []],
  ] as [GiftFilter, number[]][])("%o → %j", (filter, expected) => {
    expect(ids(filter)).toEqual(expected);
  });

  it("knows the default filter", () => {
    expect(isDefaultFilter(DEFAULT_GIFT_FILTER)).toBe(true);
    expect(isDefaultFilter({ status: "ALL", tagIds: [] })).toBe(false);
    expect(isDefaultFilter({ status: "ACTIVE", tagIds: [CHRISTMAS] })).toBe(false);
  });

  it.each([
    [{ status: "ALL", tagIds: [] }, true],
    [{ status: "ACTIVE", tagIds: [] }, true],
    [{ status: "ACTIVE", tagIds: [CHRISTMAS] }, false],
    [{ status: "ALL", tagIds: [CHRISTMAS] }, false],
    [{ status: "BOUGHT", tagIds: [] }, false],
    [{ status: "GIVEN", tagIds: [] }, false],
  ] as [GiftFilter, boolean][])("reordering allowed with %o: %s", (filter, allowed) => {
    expect(canReorderWithFilter(filter)).toBe(allowed);
  });
});
