import type { GiftLinkDraft } from "../../db/repository";
import type { Gift, GiftPriority, GiftStatus } from "../../domain/entities";
import { linkRowsToDrafts, type LinkRow } from "./linkRows";

/** The optional gift fields under "Další podrobnosti" (shared by quick add and the edit form). */
export type GiftDetails = {
  buyerPersonId: number | null;
  priority: GiftPriority;
  tagIds: number[];
  links: LinkRow[];
  note: string;
  status: GiftStatus;
};

/** A new gift: priority MEDIUM, status NEW, nothing else (PRODUCT.md §11). */
export const DEFAULT_GIFT_DETAILS: GiftDetails = {
  buyerPersonId: null,
  priority: "MEDIUM",
  tagIds: [],
  links: [],
  note: "",
  status: "NEW",
};

export type PreparedGiftDetails = {
  fields: Pick<Gift, "buyerPersonId" | "priority" | "status" | "note">;
  links: GiftLinkDraft[];
  tagIds: number[];
};

export type PrepareResult =
  | { ok: true; value: PreparedGiftDetails }
  | { ok: false; error: string; linkRowKey: string };

/** Validates the details and converts them to what the repository saves. */
export function prepareGiftDetails(details: GiftDetails): PrepareResult {
  const links = linkRowsToDrafts(details.links);
  if (!links.ok) return { ok: false, error: links.error, linkRowKey: links.rowKey };
  return {
    ok: true,
    value: {
      fields: {
        buyerPersonId: details.buyerPersonId,
        priority: details.priority,
        status: details.status,
        note: details.note.trim(),
      },
      links: links.drafts,
      tagIds: details.tagIds,
    },
  };
}
