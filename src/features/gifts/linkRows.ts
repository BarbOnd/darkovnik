import type { GiftLinkDraft } from "../../db/repository";
import type { GiftLink } from "../../domain/entities";
import { isHttpUrl, normalizeLinkUrl } from "../../domain/links";

/** One link row in the gift form; `key` is only for React, `id` marks an existing link. */
export type LinkRow = { key: string; id?: number; url: string; title: string };

let nextRowKey = 0;

export function newLinkRow(): LinkRow {
  nextRowKey += 1;
  return { key: `new-${nextRowKey}`, url: "", title: "" };
}

export function linkRowsFrom(links: GiftLink[]): LinkRow[] {
  return links.map((link) => ({ key: `link-${link.id}`, id: link.id, url: link.url, title: link.title ?? "" }));
}

export type LinkRowsResult =
  | { ok: true; drafts: GiftLinkDraft[] }
  | { ok: false; error: string; rowKey: string };

/**
 * Converts the form rows to links to save, in row order. Completely empty rows
 * are skipped; a URL without scheme gets "https://"; only http(s) is accepted.
 */
export function linkRowsToDrafts(rows: LinkRow[]): LinkRowsResult {
  const drafts: GiftLinkDraft[] = [];
  let position = 0;
  for (const row of rows) {
    const title = row.title.trim();
    if (row.url.trim() === "" && title === "") continue;
    position += 1;
    const url = normalizeLinkUrl(row.url);
    if (url === "") {
      return { ok: false, error: `Odkaz ${position}: vyplňte adresu, nebo řádek odeberte.`, rowKey: row.key };
    }
    if (!isHttpUrl(url)) {
      return {
        ok: false,
        error: `Odkaz ${position}: adresa musí začínat http:// nebo https://.`,
        rowKey: row.key,
      };
    }
    drafts.push({ ...(row.id !== undefined && { id: row.id }), url, ...(title !== "" && { title }) });
  }
  return { ok: true, drafts };
}

/** Moves the row at `index` by `offset` (−1 up, +1 down); out-of-range moves change nothing. */
export function moveRow<T>(rows: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
