import type { GiftLinkDraft } from "../../db/repository";
import type { Gift, GiftPriority, GiftStatus } from "../../domain/entities";
import { parsePriceInput } from "../../domain/gifts";
import { linkRowsToDrafts, type LinkRow } from "./linkRows";

/** The optional gift fields under "Další podrobnosti" (shared by quick add and the edit form). */
export type GiftDetails = {
  buyerPersonId: number | null;
  priority: GiftPriority;
  /** Raw "Cena" input; "" = unknown. */
  price: string;
  tagIds: number[];
  links: LinkRow[];
  note: string;
  status: GiftStatus;
};

/** A new gift: priority MEDIUM, status NEW, nothing else (PRODUCT.md §11). */
export const DEFAULT_GIFT_DETAILS: GiftDetails = {
  buyerPersonId: null,
  priority: "MEDIUM",
  price: "",
  tagIds: [],
  links: [],
  note: "",
  status: "NEW",
};

export type PreparedGiftDetails = {
  fields: Pick<Gift, "buyerPersonId" | "priority" | "status" | "note" | "price">;
  links: GiftLinkDraft[];
  tagIds: number[];
};

export type PrepareResult =
  | { ok: true; value: PreparedGiftDetails }
  | { ok: false; field: "links"; error: string; linkRowKey: string }
  | { ok: false; field: "price"; error: string };

/** Validates the details and converts them to what the repository saves. */
export function prepareGiftDetails(details: GiftDetails): PrepareResult {
  const price = parsePriceInput(details.price);
  if (!price.ok) return { ok: false, field: "price", error: price.error };
  const links = linkRowsToDrafts(details.links);
  if (!links.ok) return { ok: false, field: "links", error: links.error, linkRowKey: links.rowKey };
  return {
    ok: true,
    value: {
      fields: {
        buyerPersonId: details.buyerPersonId,
        priority: details.priority,
        status: details.status,
        note: details.note.trim(),
        price: price.value,
      },
      links: links.drafts,
      tagIds: details.tagIds,
    },
  };
}
