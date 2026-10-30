import { describe, expect, it } from "vitest";
import { birthdayToFields, fieldsToBirthday } from "./birthdayFields";

const YEAR = 2026;

describe("birthday fields", () => {
  it("returns null when nothing is filled", () => {
    expect(fieldsToBirthday({ day: "", month: "", year: "" }, YEAR)).toEqual({ ok: true, value: null });
  });

  it("stores full and yearless dates", () => {
    expect(fieldsToBirthday({ day: "4", month: "5", year: "1990" }, YEAR)).toEqual({
      ok: true,
      value: "1990-05-04",
    });
    expect(fieldsToBirthday({ day: "29", month: "2", year: "" }, YEAR)).toEqual({
      ok: true,
      value: "--02-29",
    });
    expect(fieldsToBirthday({ day: "29", month: "2", year: "2000" }, YEAR)).toEqual({
      ok: true,
      value: "2000-02-29",
    });
  });

  it.each([
    [{ day: "4", month: "", year: "" }],
    [{ day: "", month: "5", year: "1990" }],
    [{ day: "", month: "", year: "1990" }],
    [{ day: "31", month: "4", year: "" }],
    [{ day: "29", month: "2", year: "2023" }],
    [{ day: "1", month: "1", year: "90" }],
    [{ day: "1", month: "1", year: "1899" }],
    [{ day: "1", month: "1", year: "2027" }],
  ])("rejects %o with a Czech message", (fields) => {
    const result = fieldsToBirthday(fields, YEAR);
    expect(result.ok).toBe(false);
  });

  it("round-trips stored values to fields", () => {
    expect(birthdayToFields("1990-05-04")).toEqual({ day: "4", month: "5", year: "1990" });
    expect(birthdayToFields("--02-29")).toEqual({ day: "29", month: "2", year: "" });
    expect(birthdayToFields(null)).toEqual({ day: "", month: "", year: "" });
  });
});
