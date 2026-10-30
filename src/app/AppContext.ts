import { createContext, useContext } from "react";
import type { AppMetadata, GiftListRepository, UpdatePreferencesInput } from "../db/repository";

export type AppContextValue = {
  repository: GiftListRepository;
  metadata: AppMetadata;
  updatePreferences(input: UpdatePreferencesInput): Promise<void>;
  /** Short non-blocking confirmation, e.g. "Uloženo"; survives navigation. */
  showToast(message: string): void;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (value === null) throw new Error("useApp must be used inside AppContext.");
  return value;
}
