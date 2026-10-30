import { describe, expect, it } from "vitest";
import { parseRoute, paths } from "./routes";

describe("routes", () => {
  it.each([
    ["", { name: "people" }],
    ["#/", { name: "people" }],
    ["#/nastaveni", { name: "settings" }],
    ["#/osoby/nova", { name: "personNew" }],
    ["#/osoby/12", { name: "person", personId: 12 }],
    ["#/osoby/12/", { name: "person", personId: 12 }],
    ["#/osoby/12/upravit", { name: "personEdit", personId: 12 }],
    ["#/osoby/12/novy-darek", { name: "giftNew", personId: 12 }],
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
    expect(parseRoute(paths.giftNew(3))).toEqual({ name: "giftNew", personId: 3 });
    expect(parseRoute(paths.giftEdit(9))).toEqual({ name: "giftEdit", giftId: 9 });
  });
});
