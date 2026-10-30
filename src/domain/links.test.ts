import { describe, expect, it } from "vitest";
import { isHttpUrl, linkLabel, normalizeLinkUrl } from "./links";

describe("link URL input", () => {
  it.each([
    ["  https://www.alza.cz/lego ", "https://www.alza.cz/lego"],
    ["alza.cz/lego", "https://alza.cz/lego"],
    ["www.alza.cz", "https://www.alza.cz"],
    ["//alza.cz", "https://alza.cz"],
    ["http://example.test", "http://example.test"],
    ["ftp://example.test", "ftp://example.test"],
    ["javascript:alert(1)", "javascript:alert(1)"],
    ["", ""],
  ])("%s → %s", (input, url) => expect(normalizeLinkUrl(input)).toBe(url));

  it.each([
    ["https://www.alza.cz/lego", true],
    ["http://example.test", true],
    ["ftp://example.test", false],
    ["javascript:alert(1)", false],
    ["mailto:jana@example.test", false],
    ["https://", false],
    ["nesmysl", false],
  ])("isHttpUrl(%s) = %s", (url, valid) => expect(isHttpUrl(url)).toBe(valid));
});

describe("link label", () => {
  it("prefers the title, otherwise shows the host without www.", () => {
    expect(linkLabel({ url: "https://www.alza.cz/lego", title: " Alza " })).toBe("Alza");
    expect(linkLabel({ url: "https://www.alza.cz/lego" })).toBe("alza.cz");
    expect(linkLabel({ url: "https://shop.example.test/x", title: "  " })).toBe("shop.example.test");
  });
});
