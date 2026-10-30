import type { PersonDeletionImpact } from "../../db/repository";
import { formatCount, GIFT_FORMS, GIFT_GENITIVE_FORMS } from "../../lib/plural";

/** Paragraphs of the person-deletion confirmation (PRODUCT.md §1). */
export function personDeletionText(impact: PersonDeletionImpact): string[] {
  const paragraphs: string[] = [];
  if (impact.giftCount > 0) {
    paragraphs.push(`Smažou se i dárky pro tuto osobu (${formatCount(impact.giftCount, GIFT_FORMS)}).`);
  }
  if (impact.buyerGiftCount > 0) {
    paragraphs.push(
      `Tato osoba je uvedená jako kupující u ${formatCount(impact.buyerGiftCount, GIFT_GENITIVE_FORMS)} ` +
        "jiných lidí. Tyto dárky zůstanou, jen se u nich zruší, kdo je koupí.",
    );
  }
  paragraphs.push("Tuto akci nelze vrátit.");
  return paragraphs;
}
