// Periodic Background Sync is Chromium-only and not yet in TypeScript's DOM types.

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval?: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  /** Missing in browsers without Periodic Background Sync. */
  readonly periodicSync?: PeriodicSyncManager;
}
