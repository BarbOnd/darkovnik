import type { Theme } from "../domain/entities";

/** Must match --color-bg in styles/global.css and the theme-color metas in index.html. */
const THEME_COLORS = { light: "#fffaf7", dark: "#1c1715" } as const;

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
}
