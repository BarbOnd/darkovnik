const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Turns what the user typed into a link URL: trims it and adds "https://" when
 * no scheme is given ("alza.cz/lego" → "https://alza.cz/lego"). Other schemes
 * are kept, so isHttpUrl() can reject them.
 */
export function normalizeLinkUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "" || HAS_SCHEME.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/** Only http:// and https:// links are allowed (DATABASE.md → GiftLink). */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}

/** Text shown for a link: its title, or the host without "www." when there is no title. */
export function linkLabel(link: { url: string; title?: string }): string {
  const title = link.title?.trim();
  if (title) return title;
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return link.url;
  }
}
