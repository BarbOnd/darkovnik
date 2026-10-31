import { describe, expect, it } from "vitest";
import { parseRoute, paths } from "./routes";

describe("routes", () => {
  it.each([
    ["", { name: "people" }],
    ["#/", { name: "people" }],
    ["#/nastaveni", { name: "settings" }],
    ["#/nastaveni/stitky", { name: "tags" }],
    ["#/osoby/nova", { name: "personNew" }],
    ["#/osoby/12", { name: "person", personId: 12 }],
    ["#/osoby/12/", { name: "person", personId: 12 }],
    ["#/osoby/12/upravit", { name: "personEdit", personId: 12 }],
    ["#/pridat", { name: "quickAdd", personId: null, shared: null }],
    ["#/pridat/12", { name: "quickAdd", personId: 12, shared: null }],
    ["#/pridat/0", { name: "notFound" }],
    [
      "#/pridat?url=https%3A%2F%2Falza.cz%2Flego&title=Lego",
      { name: "quickAdd", personId: null, shared: { url: "https://alza.cz/lego", title: "Lego" } },
    ],
    ["#/pridat/12?title=Kniha", { name: "quickAdd", personId: 12, shared: { url: null, title: "Kniha" } }],
    ["#/pridat?x=1", { name: "quickAdd", personId: null, shared: null }],
    ["#/osoby/12?x=1", { name: "person", personId: 12 }],
    ["#/osoby/12/novy-darek", { name: "notFound" }],
    ["#/darky/7", { name: "giftEdit", giftId: 7 }],
    ["#/darky/0", { name: "notFound" }],
    ["#/darky/7/x", { name: "notFound" }],
    ["#/osoby/12/avatar", { name: "notFound" }],
    ["#/osoby/0", { name: "notFound" }],
    ["#/osoby/abc", { name: "notFound" }],
    ["#/osoby/99999999999999999999", { name: "notFound" }],
    ["#/neco", { name: "notFound" }],
  ])("%s", (hash, route) => expect(parseRoute(hash)).toEqual(route));

  it("builds paths that parse back", () => {
    expect(parseRoute(paths.person(3))).toEqual({ name: "person", personId: 3 });
    expect(parseRoute(paths.personEdit(3))).toEqual({ name: "personEdit", personId: 3 });
    expect(parseRoute(paths.settings())).toEqual({ name: "settings" });
    expect(parseRoute(paths.quickAdd())).toEqual({ name: "quickAdd", personId: null, shared: null });
    expect(parseRoute(paths.quickAdd(3))).toEqual({ name: "quickAdd", personId: 3, shared: null });
    const shared = { url: "https://alza.cz/lego?a=1&b=2", title: "Lego Technic & spol." };
    expect(parseRoute(paths.quickAdd(undefined, shared))).toEqual({ name: "quickAdd", personId: null, shared });
    expect(parseRoute(paths.quickAdd(3, { url: null, title: null }))).toEqual({
      name: "quickAdd",
      personId: 3,
      shared: null,
    });
    expect(parseRoute(paths.giftEdit(9))).toEqual({ name: "giftEdit", giftId: 9 });
  });
});
