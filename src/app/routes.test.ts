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
    ["#/osoby/12/avatar", { name: "personAvatar", personId: 12 }],
    ["#/osoby/0", { name: "notFound" }],
    ["#/osoby/abc", { name: "notFound" }],
    ["#/osoby/99999999999999999999", { name: "notFound" }],
    ["#/neco", { name: "notFound" }],
  ])("%s", (hash, route) => expect(parseRoute(hash)).toEqual(route));

  it("builds paths that parse back", () => {
    expect(parseRoute(paths.person(3))).toEqual({ name: "person", personId: 3 });
    expect(parseRoute(paths.personEdit(3))).toEqual({ name: "personEdit", personId: 3 });
    expect(parseRoute(paths.personAvatar(3))).toEqual({ name: "personAvatar", personId: 3 });
    expect(parseRoute(paths.settings())).toEqual({ name: "settings" });
  });
});
