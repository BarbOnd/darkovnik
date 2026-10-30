import { describe, expect, it } from "vitest";
import { countActiveGiftsByPerson } from "./gifts";

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
