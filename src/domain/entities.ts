import type { CropView } from "./photo";

export const GIFT_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type GiftPriority = (typeof GIFT_PRIORITIES)[number];

export const GIFT_STATUSES = ["NEW", "BOUGHT", "GIVEN"] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];

export const PEOPLE_SORT_MODES = ["ALPHABETICAL", "MANUAL"] as const;
export type PeopleSortMode = (typeof PEOPLE_SORT_MODES)[number];

export const GIFT_SORT_MODES = ["PRIORITY", "MANUAL"] as const;
export type GiftSortMode = (typeof GIFT_SORT_MODES)[number];

export const THEMES = ["SYSTEM", "LIGHT", "DARK"] as const;
export type Theme = (typeof THEMES)[number];

export const REMINDER_TYPES = ["BEFORE_30", "DAY"] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];

export function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export type Person = {
  id: number;
  name: string;
  /** "YYYY-MM-DD", or "--MM-DD" when the year is unknown. */
  birthday: string | null;
  avatarSeed: string;
  /** Cropped square JPEG `data:` URL shown instead of the avatar, or null. */
  photo: string | null;
  /** Downscaled original JPEG `data:` URL for re-editing the crop; null without photo. */
  photoSource: string | null;
  /** Crop position within photoSource; null without photo. */
  photoCrop: CropView | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Gift = {
  id: number;
  personId: number;
  name: string;
  note: string;
  priority: GiftPriority;
  status: GiftStatus;
  buyerPersonId: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type GiftLink = {
  id: number;
  giftId: number;
  url: string;
  title?: string;
  sortOrder: number;
};

export type Tag = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type GiftTag = {
  giftId: number;
  tagId: number;
};

export type NotificationLogEntry = {
  /** "<personId>:<type>:<occurrenceDate>" */
  key: string;
  personId: number;
  type: ReminderType;
  occurrenceDate: string;
  shownAt: string;
  /** When the user closed the reminder in the "Zmeškané připomínky" card; null until then. */
  seenAt: string | null;
};
