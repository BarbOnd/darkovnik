import type { SharedContent } from "../../app/routes";
import { isHttpUrl } from "../../domain/links";

const URL_IN_TEXT = /https?:\/\/\S+/i;

/**
 * Reads what another app shared into GiftList (manifest `share_target`, GET:
 * `?title=…&text=…&url=…`). Android apps put the address into `url` or into
 * `text`; the page title usually comes in `title`. Only http(s) addresses are
 * taken. Returns null when nothing usable was shared.
 */
export function parseSharedContent(search: string): SharedContent | null {
  const params = new URLSearchParams(search);
  const title = params.get("title")?.trim() ?? "";
  const text = params.get("text")?.trim() ?? "";
  const urlParam = params.get("url")?.trim() ?? "";
  const urlInText = URL_IN_TEXT.exec(text)?.[0] ?? "";
  const url = [urlParam, urlInText].find((candidate) => candidate !== "" && isHttpUrl(candidate)) ?? null;
  const textWithoutUrl = urlInText === "" ? text : text.replace(urlInText, "").trim();
  const name = [title, textWithoutUrl].find((candidate) => candidate !== "" && candidate !== url) ?? null;
  if (url === null && name === null) return null;
  return { url, title: name };
}
