import { useSyncExternalStore } from "react";

/** A link and/or name shared into the app from another app (PRODUCT.md §11), prefilled in quick add. */
export type SharedContent = { url: string | null; title: string | null };

/** Hash-based routes, so the static GitHub Pages hosting needs no server rewrites. */
export type Route =
  | { name: "people" }
  | { name: "settings" }
  | { name: "tags" }
  | { name: "personNew" }
  | { name: "person"; personId: number }
  | { name: "personEdit"; personId: number }
  | { name: "giftEdit"; giftId: number }
  /** Quick add; `personId` is preselected as recipient when opened from a person. */
  | { name: "quickAdd"; personId: number | null; shared: SharedContent | null }
  | { name: "notFound" };

export const paths = {
  people: () => "#/",
  settings: () => "#/nastaveni",
  tags: () => "#/nastaveni/stitky",
  personNew: () => "#/osoby/nova",
  person: (personId: number) => `#/osoby/${personId}`,
  personEdit: (personId: number) => `#/osoby/${personId}/upravit`,
  giftEdit: (giftId: number) => `#/darky/${giftId}`,
  quickAdd: (personId?: number, shared?: SharedContent | null) => {
    const base = personId === undefined ? "#/pridat" : `#/pridat/${personId}`;
    if (shared === undefined || shared === null) return base;
    const params = new URLSearchParams();
    if (shared.url !== null) params.set("url", shared.url);
    if (shared.title !== null) params.set("title", shared.title);
    const query = params.toString();
    return query === "" ? base : `${base}?${query}`;
  },
};

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function sharedFrom(query: string): SharedContent | null {
  const params = new URLSearchParams(query);
  const url = params.get("url") ?? "";
  const title = params.get("title") ?? "";
  if (url === "" && title === "") return null;
  return { url: url === "" ? null : url, title: title === "" ? null : title };
}

export function parseRoute(hash: string): Route {
  // Only quick add reads the query part (shared content); other routes ignore it.
  const [pathPart, query = ""] = hash.replace(/^#/, "").split("?", 2);
  const path = pathPart.replace(/\/+$/, "");
  if (path === "") return { name: "people" };
  if (path === "/nastaveni") return { name: "settings" };
  if (path === "/nastaveni/stitky") return { name: "tags" };
  if (path === "/osoby/nova") return { name: "personNew" };
  if (path === "/pridat") return { name: "quickAdd", personId: null, shared: sharedFrom(query) };
  const quickAddMatch = /^\/pridat\/([1-9]\d*)$/.exec(path);
  if (quickAddMatch !== null) {
    const personId = parseId(quickAddMatch[1]);
    return personId === null ? { name: "notFound" } : { name: "quickAdd", personId, shared: sharedFrom(query) };
  }
  const personMatch = /^\/osoby\/([1-9]\d*)(?:\/(upravit))?$/.exec(path);
  if (personMatch !== null) {
    const personId = parseId(personMatch[1]);
    if (personId === null) return { name: "notFound" };
    if (personMatch[2] === "upravit") return { name: "personEdit", personId };
    return { name: "person", personId };
  }
  const giftMatch = /^\/darky\/([1-9]\d*)$/.exec(path);
  if (giftMatch !== null) {
    const giftId = parseId(giftMatch[1]);
    return giftId === null ? { name: "notFound" } : { name: "giftEdit", giftId };
  }
  return { name: "notFound" };
}

const NAVIGATE_EVENT = "giftlist:navigate";

/** History entries created by in-app navigation carry this state, so goBack() knows it stays in the app. */
type HistoryState = { inApp: true } | null;

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}

export function navigate(path: string): void {
  if (path === window.location.hash) return;
  window.history.pushState({ inApp: true } satisfies HistoryState, "", path);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

/** Navigates without adding a history entry (e.g. from a "new" form to the created record). */
export function replaceRoute(path: string): void {
  window.history.replaceState(window.history.state as HistoryState, "", path);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

/** Returns to the previous in-app screen, or replaces the current one with `fallback`. */
export function goBack(fallback: string): void {
  if ((window.history.state as HistoryState)?.inApp === true) window.history.back();
  else replaceRoute(fallback);
}
