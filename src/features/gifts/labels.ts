import type { GiftPriority, GiftStatus } from "../../domain/entities";

export const PRIORITY_LABELS: Record<GiftPriority, string> = {
  LOW: "Nízká",
  MEDIUM: "Střední",
  HIGH: "Vysoká",
};

/** Number of filled stars (1–3) shown for a priority. */
export const PRIORITY_STARS: Record<GiftPriority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export const STATUS_LABELS: Record<GiftStatus, string> = {
  NEW: "Nápad",
  BOUGHT: "Koupeno",
  GIVEN: "Předáno",
};
