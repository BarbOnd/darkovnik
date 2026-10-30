import { useSyncExternalStore } from "react";

/** Hash-based routes, so the static GitHub Pages hosting needs no server rewrites. */
export type Route =
  | { name: "people" }
  | { name: "settings" }
  | { name: "personNew" }
  | { name: "person"; personId: number }
  | { name: "personEdit"; personId: number }
  | { name: "notFound" };

export const paths = {
  people: () => "#/",
  settings: () => "#/nastaveni",
  personNew: () => "#/osoby/nova",
  person: (personId: number) => `#/osoby/${personId}`,
  personEdit: (personId: number) => `#/osoby/${personId}/upravit`,
};

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, "").replace(/\/+$/, "");
  if (path === "") return { name: "people" };
  if (path === "/nastaveni") return { name: "settings" };
  if (path === "/osoby/nova") return { name: "personNew" };
  const personMatch = /^\/osoby\/([1-9]\d*)(?:\/(upravit))?$/.exec(path);
  if (personMatch !== null) {
    const personId = Number(personMatch[1]);
    if (!Number.isSafeInteger(personId)) return { name: "notFound" };
    if (personMatch[2] === "upravit") return { name: "personEdit", personId };
    return { name: "person", personId };
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
