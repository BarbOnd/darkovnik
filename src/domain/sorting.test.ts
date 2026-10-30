import { describe, expect, it } from "vitest";
import type { Gift, Person } from "./entities";
import { sortGifts, sortPeople } from "./sorting";

function person(id: number, name: string, sortOrder: number): Person {
  return {
    id,
    name,
    birthday: null,
    avatarSeed: "x",
    photo: null,
    photoSource: null,
    photoCrop: null,
    sortOrder,
    createdAt: "",
    updatedAt: "",
  };
}

function gift(id: number, priority: Gift["priority"], createdAt: string, sortOrder: number): Gift {
  return {
    id,
    personId: 1,
    name: `Dárek ${id}`,
    note: "",
    priority,
    status: "NEW",
    buyerPersonId: null,
    sortOrder,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("people sorting", () => {
  const people = [
    person(1, "Zuzana", 0),
    person(2, "Čeněk", 3),
    person(3, "Adam", 2),
    person(4, "Cyril", 1),
    person(5, "Adam", 4),
  ];

  it("sorts alphabetically using Czech collation, ties by id", () => {
    expect(sortPeople(people, "ALPHABETICAL").map((p) => p.id)).toEqual([3, 5, 4, 2, 1]);
  });

  it("sorts manually by sortOrder", () => {
    expect(sortPeople(people, "MANUAL").map((p) => p.id)).toEqual([1, 4, 3, 2, 5]);
  });
});

describe("gift sorting", () => {
  const gifts = [
    gift(1, "LOW", "2026-01-03T00:00:00.000Z", 3),
    gift(2, "MEDIUM", "2026-01-01T00:00:00.000Z", 0),
    gift(3, "HIGH", "2026-01-01T00:00:00.000Z", 2),
    gift(4, "MEDIUM", "2026-01-02T00:00:00.000Z", 1),
    gift(5, "MEDIUM", "2026-01-02T00:00:00.000Z", 4),
  ];

  it("sorts by priority, then newest first, ties by id", () => {
    expect(sortGifts(gifts, "PRIORITY").map((g) => g.id)).toEqual([3, 4, 5, 2, 1]);
  });

  it("sorts manually by sortOrder", () => {
    expect(sortGifts(gifts, "MANUAL").map((g) => g.id)).toEqual([2, 4, 3, 1, 5]);
  });
});
