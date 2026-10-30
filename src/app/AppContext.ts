import { createContext, useContext } from "react";
import type { AppMetadata, GiftListRepository, UpdatePreferencesInput } from "../db/repository";
import type { DueReminder } from "../domain/birthdays";
import type { Person } from "../domain/entities";

export type AppContextValue = {
  repository: GiftListRepository;
  metadata: AppMetadata;
  updatePreferences(input: UpdatePreferencesInput): Promise<void>;
  /** Re-reads metadata after changes made outside updatePreferences (e.g. an import). */
  reloadMetadata(): Promise<void>;
  /** Short non-blocking confirmation, e.g. "Uloženo"; survives navigation. */
  showToast(message: string): void;
  /** Reminders found in this session, for the "Zmeškané připomínky" card. */
  missedReminders: DueReminder<Person>[];
  dismissMissedReminders(): void;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (value === null) throw new Error("useApp must be used inside AppContext.");
  return value;
}
