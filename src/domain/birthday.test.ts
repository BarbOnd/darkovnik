import { describe, expect, it } from "vitest";
import { formatBirthday, isValidBirthday, parseBirthday } from "./birthday";

describe("birthday format", () => {
  it.each(["1990-05-14", "2000-02-29", "--05-14", "--02-29", "--12-31", "0001-01-01"])(
    "accepts %s",
    (value) => expect(isValidBirthday(value)).toBe(true),
  );

  it.each([
    "",
    "1990-5-14",
    "90-05-14",
    "1990-13-01",
    "1990-00-10",
    "1990-04-31",
    "1991-02-29",
    "1900-02-29",
    "--02-30",
    "--13-01",
    "--00-01",
    "05-14",
    "-05-14",
    "1990-05-14T00:00:00Z",
    "0000-01-01",
  ])("rejects %s", (value) => expect(isValidBirthday(value)).toBe(false));

  it("parses full and yearless dates", () => {
    expect(parseBirthday("1990-05-14")).toEqual({ year: 1990, month: 5, day: 14 });
    expect(parseBirthday("--02-29")).toEqual({ year: null, month: 2, day: 29 });
    expect(parseBirthday("--02-30")).toBeNull();
  });

  it("formats parts to the stored form", () => {
    expect(formatBirthday({ year: 1990, month: 5, day: 4 })).toBe("1990-05-04");
    expect(formatBirthday({ year: null, month: 2, day: 29 })).toBe("--02-29");
    expect(() => formatBirthday({ year: 2023, month: 2, day: 29 })).toThrow();
  });
});
