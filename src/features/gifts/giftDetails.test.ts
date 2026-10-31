import { describe, expect, it } from "vitest";
import { DEFAULT_GIFT_DETAILS, prepareGiftDetails } from "./giftDetails";

describe("gift details", () => {
  it("defaults to a new gift with priority MEDIUM and status NEW", () => {
    expect(prepareGiftDetails(DEFAULT_GIFT_DETAILS)).toEqual({
      ok: true,
      value: {
        fields: { buyerPersonId: null, priority: "MEDIUM", status: "NEW", note: "", price: null },
        links: [],
        tagIds: [],
      },
    });
  });

  it("trims the note, parses the price and converts links", () => {
    const result = prepareGiftDetails({
      ...DEFAULT_GIFT_DETAILS,
      buyerPersonId: 2,
      priority: "HIGH",
      status: "BOUGHT",
      price: "1 249,90",
      tagIds: [1, 3],
      note: "  velká krabice ",
      links: [{ key: "a", url: "alza.cz/lego", title: "" }],
    });
    expect(result).toEqual({
      ok: true,
      value: {
        fields: { buyerPersonId: 2, priority: "HIGH", status: "BOUGHT", note: "velká krabice", price: 1249.9 },
        links: [{ url: "https://alza.cz/lego" }],
        tagIds: [1, 3],
      },
    });
  });

  it("reports an invalid link with its row", () => {
    expect(
      prepareGiftDetails({ ...DEFAULT_GIFT_DETAILS, links: [{ key: "x", url: "ftp://a.test", title: "" }] }),
    ).toEqual({ ok: false, field: "links", error: "Odkaz 1: adresa musí začínat http:// nebo https://.", linkRowKey: "x" });
  });

  it("reports an invalid price", () => {
    expect(prepareGiftDetails({ ...DEFAULT_GIFT_DETAILS, price: "asi tisíc" })).toEqual({
      ok: false,
      field: "price",
      error: "Cenu zadejte jako číslo, třeba 1200 nebo 349,90.",
    });
  });
});
