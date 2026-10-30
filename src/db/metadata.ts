import type { GiftSortMode, PeopleSortMode, Theme } from "../domain/entities";

export const METADATA_KEY = "app";

export type AppPreferences = {
  birthdayNotificationsEnabled: boolean;
  /** ISO-8601 timestamp of the last successful export. Device-local, not exported. */
  lastExportAt: string | null;
  peopleSortMode: PeopleSortMode;
  giftSortMode: GiftSortMode;
  theme: Theme;
};

export type AppMetadata = AppPreferences & {
  schemaVersion: number;
  highestPersonId: number;
  highestGiftId: number;
  highestTagId: number;
  highestGiftLinkId: number;
  initializationComplete: boolean;
};

export type MetadataRecord = AppMetadata & { key: typeof METADATA_KEY };

/** Defaults for the fields added in schema version 2. */
export const DEFAULT_V2_PREFERENCES = {
  lastExportAt: null,
  peopleSortMode: "ALPHABETICAL",
  giftSortMode: "PRIORITY",
  theme: "SYSTEM",
} as const satisfies Omit<AppPreferences, "birthdayNotificationsEnabled">;
