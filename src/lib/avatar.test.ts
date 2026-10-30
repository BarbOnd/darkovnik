import { describe, expect, it } from "vitest";
import { avatarDataUri, avatarInitial, createAvatarSeed } from "./avatar";

function svgOf(dataUri: string): string {
  return decodeURIComponent(dataUri.replace(/^data:image\/svg\+xml;charset=utf-8,/, ""));
}

describe("avatar seed", () => {
  it("is an opaque random hex string", () => {
    const seeds = new Set(Array.from({ length: 50 }, () => createAvatarSeed()));
    expect(seeds.size).toBe(50);
    seeds.forEach((seed) => expect(seed).toMatch(/^[0-9a-f]{32}$/));
  });
});

describe("avatar initial", () => {
  it.each([
    ["Jana", "J"],
    ["  čeněk", "Č"],
    ["Šťastný Petr", "Š"],
    ["3. teta", "T"],
    ["", "?"],
    ["123", "?"],
  ])("%s → %s", (name, initial) => expect(avatarInitial(name)).toBe(initial));
});

describe("avatar rendering", () => {
  const seed = "0123456789abcdef0123456789abcdef";

  it("renders locally and deterministically from the seed", () => {
    const uri = avatarDataUri(seed, "Jana");
    expect(uri.startsWith("data:image/svg+xml")).toBe(true);
    expect(avatarDataUri(seed, "Jana")).toBe(uri);
    expect(avatarDataUri(createAvatarSeed(), "Jana")).not.toBe(uri);
    // URLs appear only as license metadata; nothing is loaded from the network.
    expect(svgOf(uri)).not.toMatch(/(href|src)="https?:|url\(\s*["']?https?:|@import/);
  });

  it("shows the initial of the current name and keeps the rest of the face", () => {
    const jana = svgOf(avatarDataUri(seed, "Jana"));
    const petr = svgOf(avatarDataUri(seed, "Petr"));
    expect(jana).toMatch(/>J<\/text>/);
    expect(petr).toMatch(/>P<\/text>/);
    expect(petr.replace(/>P<\/text>/, ">J</text>")).toBe(jana);
  });

  it("escapes the initial as XML text", () => {
    expect(svgOf(avatarDataUri(seed, "<b>"))).toMatch(/>B<\/text>/);
  });
});
