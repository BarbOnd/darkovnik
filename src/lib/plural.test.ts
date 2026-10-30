import { describe, expect, it } from "vitest";
import {
  DAY_FORMS,
  formatCount,
  GIFT_FORMS,
  GIFT_GENITIVE_FORMS,
  LINK_FORMS,
  PERSON_FORMS,
  TAG_FORMS,
  YEAR_FORMS,
} from "./plural";

describe("Czech plurals", () => {
  it.each([
    [0, "0 dárků"],
    [1, "1 dárek"],
    [2, "2 dárky"],
    [4, "4 dárky"],
    [5, "5 dárků"],
    [11, "11 dárků"],
    [21, "21 dárků"],
    [22, "22 dárků"],
    [101, "101 dárků"],
  ])("gifts: %i → %s", (count, text) => expect(formatCount(count, GIFT_FORMS)).toBe(text));

  it.each([
    [1, "1 dárku"],
    [3, "3 dárků"],
    [5, "5 dárků"],
  ])("gifts genitive: %i → %s", (count, text) =>
    expect(formatCount(count, GIFT_GENITIVE_FORMS)).toBe(text),
  );

  it.each([
    [1, PERSON_FORMS, "1 osoba"],
    [3, PERSON_FORMS, "3 osoby"],
    [5, PERSON_FORMS, "5 osob"],
    [1, TAG_FORMS, "1 štítek"],
    [4, TAG_FORMS, "4 štítky"],
    [0, LINK_FORMS, "0 odkazů"],
  ])("%i with forms → %s", (count, forms, text) => expect(formatCount(count, forms)).toBe(text));

  it.each([
    [1, "1 den"],
    [3, "3 dny"],
    [12, "12 dní"],
  ])("days: %i → %s", (count, text) => expect(formatCount(count, DAY_FORMS)).toBe(text));

  it.each([
    [1, "1 rok"],
    [2, "2 roky"],
    [31, "31 let"],
  ])("years: %i → %s", (count, text) => expect(formatCount(count, YEAR_FORMS)).toBe(text));
});
