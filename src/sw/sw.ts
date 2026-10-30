/// <reference lib="webworker" />
// Service worker: offline app shell, update on request, background birthday check.
// No runtime dependencies and no network services (CLAUDE.md → zero cost).

import { createGiftListRepository } from "../db/repository";
import { localDateOf } from "../domain/birthdays";
import {
  evaluateReminders,
  NOTIFICATION_TAG,
  NOTIFICATION_TITLE,
  PERIODIC_SYNC_TAG,
  reminderNotificationBody,
} from "../features/notifications/evaluate";

type PrecacheEntry = { url: string; revision: string | null };

declare const self: ServiceWorkerGlobalScope & {
  /** Replaced at build time by vite-plugin-pwa with the list of app files. */
  __WB_MANIFEST: PrecacheEntry[];
};

interface PeriodicSyncEvent extends ExtendableEvent {
  readonly tag: string;
}

const PRECACHE = self.__WB_MANIFEST;
const CACHE_PREFIX = "giftlist-shell-";

/** Small stable hash, so every build with different files gets its own cache. */
function hash(text: string): string {
  let value = 5381;
  for (let index = 0; index < text.length; index += 1) value = (value * 33) ^ text.charCodeAt(index);
  return (value >>> 0).toString(36);
}

const CACHE_NAME = CACHE_PREFIX + hash(JSON.stringify(PRECACHE));
const scope = self.registration.scope;
const INDEX_URL = new URL("index.html", scope).href;

function precacheUrl(entry: PrecacheEntry): string {
  return new URL(entry.url, scope).href;
}

self.addEventListener("install", (event) => {
  // Not activated automatically: the app shows "Je dostupná nová verze" first.
  // Duplicates must be removed: cache.addAll() rejects them, which silently discards
  // the whole registration. "reload" bypasses the HTTP cache, so a new version never
  // stores an old index.html that points to files the server no longer has.
  const urls = [...new Set(PRECACHE.map(precacheUrl))];
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urls.map((url) => new Request(url, { cache: "reload" })))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if ((event.data as { type?: unknown } | null)?.type === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(scope)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Hash routing: every page of the app is index.html (offline app shell).
      // ignoreVary: module scripts are requested with an Origin header that the precached
      // copies lack; with "Vary: Origin" they would not match and fail offline.
      const cached =
        request.mode === "navigate"
          ? await cache.match(INDEX_URL, { ignoreVary: true })
          : await cache.match(request, { ignoreVary: true });
      return cached ?? fetch(request);
    })(),
  );
});

/** Same logic as in the open app; runs only when the user turned reminders on. */
async function checkBirthdayReminders(): Promise<void> {
  const repository = createGiftListRepository();
  try {
    await repository.initialize();
    if (!(await repository.getMetadata()).birthdayNotificationsEnabled) return;
    const claimed = await evaluateReminders(repository, localDateOf(new Date()));
    if (claimed.length === 0 || Notification.permission !== "granted") return;
    await self.registration.showNotification(NOTIFICATION_TITLE, {
      body: reminderNotificationBody(claimed),
      tag: NOTIFICATION_TAG,
      icon: new URL("icons/icon-192.png", scope).href,
    });
  } finally {
    repository.close();
  }
}

self.addEventListener("periodicsync", ((event: PeriodicSyncEvent) => {
  if (event.tag === PERIODIC_SYNC_TAG) event.waitUntil(checkBirthdayReminders());
}) as EventListener);

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => client.url.startsWith(scope));
      if (open !== undefined) await open.focus();
      else await self.clients.openWindow(scope);
    })(),
  );
});
