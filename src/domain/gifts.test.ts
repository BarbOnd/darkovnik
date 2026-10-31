import { describe, expect, it } from "vitest";
import { countActiveGiftsByPerson, findSimilarGift } from "./gifts";

describe("active gift counts", () => {
  it("counts NEW and BOUGHT gifts per recipient, not GIVEN", () => {
    const counts = countActiveGiftsByPerson([
      { personId: 1, status: "NEW" },
      { personId: 1, status: "BOUGHT" },
      { personId: 1, status: "GIVEN" },
      { personId: 2, status: "GIVEN" },
      { personId: 3, status: "NEW" },
    ]);
    expect(counts.get(1)).toBe(2);
    expect(counts.get(2)).toBeUndefined();
    expect(counts.get(3)).toBe(1);
  });
});

describe("similar gift (duplicate hint in quick add)", () => {
  const gifts = [
    { personId: 1, name: "Lego Technic" },
    { personId: 2, name: " lego technic " },
    { personId: 2, name: "Kniha" },
  ];

  it("matches the same name case-insensitively for the recipients in order", () => {
    expect(findSimilarGift(gifts, [2, 1], "LEGO TECHNIC")).toBe(gifts[1]);
    expect(findSimilarGift(gifts, [1, 2], "lego technic")).toBe(gifts[0]);
    expect(findSimilarGift(gifts, [1], "Kniha")).toBeUndefined();
  });

  it("matches nothing for an empty name or no recipients", () => {
    expect(findSimilarGift(gifts, [1, 2], "  ")).toBeUndefined();
    expect(findSimilarGift(gifts, [], "Kniha")).toBeUndefined();
  });
});
