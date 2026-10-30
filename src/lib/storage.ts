export type PersistenceState = "persisted" | "not-persisted" | "unsupported";

/** Whether the browser promised not to evict this app's data under storage pressure. */
export async function persistenceState(): Promise<PersistenceState> {
  if (typeof navigator === "undefined" || navigator.storage?.persisted === undefined) return "unsupported";
  try {
    return (await navigator.storage.persisted()) ? "persisted" : "not-persisted";
  } catch {
    return "unsupported";
  }
}

/**
 * Asks for persistent storage (PRODUCT.md §14). Safe to call repeatedly; the
 * browser decides (installed apps are usually granted it).
 */
export async function requestPersistentStorage(): Promise<PersistenceState> {
  const current = await persistenceState();
  if (current !== "not-persisted") return current;
  try {
    return (await navigator.storage.persist()) ? "persisted" : "not-persisted";
  } catch {
    return "not-persisted";
  }
}
