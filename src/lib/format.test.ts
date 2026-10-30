import { describe, expect, it } from "vitest";
import { formatBirthdayCs } from "./format";

describe("Czech birthday formatting", () => {
  it.each([
    ["1990-05-14", "14. května 1990"],
    ["--05-14", "14. května"],
    ["--02-29", "29. února"],
    ["2001-12-01", "1. prosince 2001"],
    ["nesmysl", ""],
  ])("%s → %s", (birthday, text) => expect(formatBirthdayCs(birthday)).toBe(text));
});
