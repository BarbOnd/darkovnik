import { describe, expect, it } from "vitest";
import {
  countActiveGiftsByPerson,
  findSimilarGift,
  isValidPrice,
  parsePriceInput,
  priceToInput,
  searchGifts,
  summarizePrices,
} from "./gifts";

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

describe("price", () => {
  it("parses user input with spaces and a comma or dot", () => {
    expect(parsePriceInput("")).toEqual({ ok: true, value: null });
    expect(parsePriceInput("  ")).toEqual({ ok: true, value: null });
    expect(parsePriceInput("1 200")).toEqual({ ok: true, value: 1200 });
    expect(parsePriceInput("349,90")).toEqual({ ok: true, value: 349.9 });
    expect(parsePriceInput("349.9")).toEqual({ ok: true, value: 349.9 });
    expect(parsePriceInput("0")).toEqual({ ok: true, value: 0 });
  });

  it("rejects text, negative numbers, three decimals and huge values", () => {
    expect(parsePriceInput("tisíc").ok).toBe(false);
    expect(parsePriceInput("-5").ok).toBe(false);
    expect(parsePriceInput("1,234").ok).toBe(false);
    expect(parsePriceInput("999999999999").ok).toBe(false);
  });

  it("validates stored prices and round-trips the input", () => {
    expect(isValidPrice(null)).toBe(true);
    expect(isValidPrice(1249.9)).toBe(true);
    expect(isValidPrice(-1)).toBe(false);
    expect(isValidPrice(1.234)).toBe(false);
    expect(isValidPrice("12")).toBe(false);
    expect(priceToInput(null)).toBe("");
    expect(priceToInput(1249.9)).toBe("1249,9");
  });

  it("sums known prices and counts gifts without one", () => {
    expect(summarizePrices([{ price: 100.1 }, { price: 0.2 }, { price: null }])).toEqual({
      total: 100.3,
      priced: 2,
      unpriced: 1,
    });
    expect(summarizePrices([])).toEqual({ total: 0, priced: 0, unpriced: 0 });
  });
});

describe("search", () => {
  const gifts = [
    { id: 1, name: "Lego Technic", note: "" },
    { id: 2, name: "Kniha", note: "stavebnice Lego" },
    { id: 3, name: "Šála", note: "" },
    { id: 4, name: "Auto lego", note: "" },
  ];

  it("matches name or note case-insensitively, name matches first", () => {
    expect(searchGifts(gifts, " LEGO ").map((gift) => gift.id)).toEqual([4, 1, 2]);
    expect(searchGifts(gifts, "šá").map((gift) => gift.id)).toEqual([3]);
  });

  it("returns nothing for an empty query", () => {
    expect(searchGifts(gifts, "   ")).toEqual([]);
  });
});
