import { describe, expect, it } from "vitest";
import { parseSharedContent } from "./shareTarget";

describe("share target (content shared from other apps)", () => {
  it("takes the address from url and the name from title", () => {
    expect(parseSharedContent("?title=Lego+Technic&url=https%3A%2F%2Falza.cz%2Flego")).toEqual({
      url: "https://alza.cz/lego",
      title: "Lego Technic",
    });
  });

  it("finds the address inside text and drops it from the name", () => {
    expect(parseSharedContent("?text=Kniha+https%3A%2F%2Fexample.test%2Fkniha")).toEqual({
      url: "https://example.test/kniha",
      title: "Kniha",
    });
  });

  it("does not use the address as a name when title repeats it", () => {
    expect(parseSharedContent("?title=https%3A%2F%2Fexample.test&text=https%3A%2F%2Fexample.test")).toEqual({
      url: "https://example.test",
      title: null,
    });
  });

  it("accepts only http(s) addresses and keeps the name alone", () => {
    expect(parseSharedContent("?title=Pozn%C3%A1mka&url=javascript%3Aalert(1)")).toEqual({
      url: null,
      title: "Poznámka",
    });
  });

  it("returns null when nothing usable was shared", () => {
    expect(parseSharedContent("")).toBeNull();
    expect(parseSharedContent("?utm_source=x")).toBeNull();
    expect(parseSharedContent("?title=+&text=+")).toBeNull();
  });
});
