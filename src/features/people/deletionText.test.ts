import { describe, expect, it } from "vitest";
import { personDeletionText } from "./deletionText";

describe("person deletion text", () => {
  it("only warns that it cannot be undone when nothing else is affected", () => {
    expect(personDeletionText({ giftCount: 0, buyerGiftCount: 0 })).toEqual(["Tuto akci nelze vrátit."]);
  });

  it("mentions own gifts and warns about other people's gifts as buyer", () => {
    expect(personDeletionText({ giftCount: 3, buyerGiftCount: 1 })).toEqual([
      "Smažou se i dárky pro tuto osobu (3 dárky).",
      "Tato osoba je uvedená jako kupující u 1 dárku jiných lidí. Tyto dárky zůstanou, jen se u nich zruší, kdo je koupí.",
      "Tuto akci nelze vrátit.",
    ]);
    expect(personDeletionText({ giftCount: 0, buyerGiftCount: 5 })[0]).toContain("u 5 dárků jiných lidí");
  });
});
