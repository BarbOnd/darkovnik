import type { Gift } from "./entities";

/** Upper bound for a gift price (CZK); keeps sums and inputs sane. */
export const MAX_PRICE = 100_000_000;

/** A stored price: null (unknown) or a finite non-negative number with at most two decimals. */
export function isValidPrice(value: unknown): value is number | null {
  if (value === null) return true;
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_PRICE &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-6
  );
}

export type PriceInputResult = { ok: true; value: number | null } | { ok: false; error: string };

/**
 * Parses what the user typed into "Cena": empty → null; "1 200", "1200,50" and
 * "1200.5" are accepted (spaces as thousands separators, comma or dot as the
 * decimal separator); rounded to two decimals.
 */
export function parsePriceInput(input: string): PriceInputResult {
  // \s also covers the non-breaking space that thousands separators sometimes use.
  const cleaned = input.replace(/\s/g, "").replace(",", ".");
  if (cleaned === "") return { ok: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, error: "Cenu zadejte jako číslo, třeba 1200 nebo 349,90." };
  }
  const value = Math.round(Number(cleaned) * 100) / 100;
  if (value > MAX_PRICE) return { ok: false, error: "Cena je příliš vysoká." };
  return { ok: true, value };
}

/** "1200.5" for the input field; "" when the price is unknown. */
export function priceToInput(price: number | null): string {
  return price === null ? "" : String(price).replace(".", ",");
}

export type PriceSummary = { total: number; priced: number; unpriced: number };

/** Sum of known prices in a list, with how many gifts have and lack a price. */
export function summarizePrices(gifts: readonly Pick<Gift, "price">[]): PriceSummary {
  let total = 0;
  let priced = 0;
  for (const gift of gifts) {
    if (gift.price === null) continue;
    total = Math.round((total + gift.price) * 100) / 100;
    priced += 1;
  }
  return { total, priced, unpriced: gifts.length - priced };
}

function normalizeSearchText(text: string): string {
  return text.trim().toLocaleLowerCase("cs-CZ");
}

/**
 * Gifts whose name or note contains the query (trimmed, case-insensitive,
 * cs-CZ); an empty query matches nothing. Name matches come first, then
 * note-only matches, each group sorted by name (cs-CZ) and id.
 */
export function searchGifts<T extends Pick<Gift, "id" | "name" | "note">>(gifts: readonly T[], query: string): T[] {
  const wanted = normalizeSearchText(query);
  if (wanted === "") return [];
  const inName: T[] = [];
  const inNote: T[] = [];
  for (const gift of gifts) {
    if (normalizeSearchText(gift.name).includes(wanted)) inName.push(gift);
    else if (normalizeSearchText(gift.note).includes(wanted)) inNote.push(gift);
  }
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, "cs-CZ") || a.id - b.id;
  return [...inName.sort(byName), ...inNote.sort(byName)];
}

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
