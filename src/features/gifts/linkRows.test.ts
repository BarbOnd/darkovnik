import { describe, expect, it } from "vitest";
import { linkRowsFrom, linkRowsToDrafts, moveRow, type LinkRow } from "./linkRows";

function row(key: string, url: string, title = "", id?: number): LinkRow {
  return { key, url, title, ...(id !== undefined && { id }) };
}

describe("link rows → drafts", () => {
  it("keeps order, ids and titles, adds https:// and skips empty rows", () => {
    expect(
      linkRowsToDrafts([
        row("a", " alza.cz/lego ", " Alza ", 5),
        row("b", "", ""),
        row("c", "http://example.test"),
      ]),
    ).toEqual({
      ok: true,
      drafts: [
        { id: 5, url: "https://alza.cz/lego", title: "Alza" },
        { url: "http://example.test" },
      ],
    });
  });

  it("reports a row with a title but no URL, numbered among non-empty rows", () => {
    expect(linkRowsToDrafts([row("a", ""), row("b", "x.cz"), row("c", "", "Jen název")])).toEqual({
      ok: false,
      error: "Odkaz 2: vyplňte adresu, nebo řádek odeberte.",
      rowKey: "c",
    });
  });

  it.each(["ftp://example.test", "javascript:alert(1)", "https://"])("rejects %s", (url) => {
    const result = linkRowsToDrafts([row("a", url)]);
    expect(result).toEqual({
      ok: false,
      error: "Odkaz 1: adresa musí začínat http:// nebo https://.",
      rowKey: "a",
    });
  });

  it("builds rows from stored links", () => {
    expect(
      linkRowsFrom([
        { id: 3, giftId: 1, url: "https://a.test", title: "A", sortOrder: 0 },
        { id: 4, giftId: 1, url: "https://b.test", sortOrder: 1 },
      ]),
    ).toEqual([
      { key: "link-3", id: 3, url: "https://a.test", title: "A" },
      { key: "link-4", id: 4, url: "https://b.test", title: "" },
    ]);
  });
});

describe("moveRow", () => {
  it("swaps with the neighbour and ignores moves past the ends", () => {
    expect(moveRow(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveRow(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
    const rows = ["a", "b"];
    expect(moveRow(rows, 0, -1)).toBe(rows);
    expect(moveRow(rows, 1, 1)).toBe(rows);
  });
});
