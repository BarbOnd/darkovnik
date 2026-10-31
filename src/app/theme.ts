import { isOneOf, THEMES, type Theme } from "../domain/entities";

/** Must match --color-bg in styles/global.css and the theme-color metas in index.html. */
const THEME_COLORS = { light: "#fffaf7", dark: "#1c1715" } as const;

/**
 * localStorage mirror of the theme preference (IndexedDB stays the source of
 * truth), so a forced theme applies before the database opens and the start
 * does not flash the system theme.
 */
const THEME_STORAGE_KEY = "giftlist.theme";

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isOneOf(THEMES, stored) ? stored : "SYSTEM";
  } catch {
    return "SYSTEM";
  }
}

/**
 * SYSTEM follows prefers-color-scheme through CSS; LIGHT/DARK force it with
 * `data-theme` on <html>. The theme-color metas keep the Android status bar in sync.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "SYSTEM") root.removeAttribute("data-theme");
  else root.dataset.theme = theme === "DARK" ? "dark" : "light";

  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const scheme = meta.media.includes("dark") ? "dark" : "light";
    const forced = theme === "DARK" ? "dark" : theme === "LIGHT" ? "light" : scheme;
    meta.content = THEME_COLORS[forced];
  });

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (e.g. private window): the theme still applies after the database opens.
  }
}
