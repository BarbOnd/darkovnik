# Architecture

## Goal

Keep GiftList a small client-side PWA with persistent local storage and no backend.

```text
React UI
   |
   v
Application/domain logic
   |
   v
Repository / storage layer
   |
   v
IndexedDB
```

The UI must not access IndexedDB directly. A small repository abstraction keeps persistence replaceable so synchronization could be added later.

## Technology

### Vite
Build tool and development server. For GitHub Pages, `base` in `vite.config.ts` must be set to `/<repository-name>/` (set in the release phase, phase 9; the manifest `id`, `start_url`, and `scope` are already relative so they follow `base`).

### React
UI and component model.

### TypeScript
Strict mode. Avoid `any` unless there is a documented reason.

### PWA
The application must:
- provide a web app manifest with icons (incl. a maskable icon for Android) and an `apple-touch-icon` link in `index.html` (iOS ignores manifest icons for the home screen);
- support installation on Android, standalone display mode;
- cache the application shell for offline use;
- work correctly after installation.

Use `vite-plugin-pwa` with `strategies: "injectManifest"` and `registerType: "prompt"`: when a new version is available, the UI offers "Načíst znovu" instead of reloading silently.

The service worker (`src/sw/sw.ts`, own `tsconfig.sw.json` with the WebWorker lib) is written without Workbox runtime libraries: it precaches the build file list injected by the plugin (duplicates removed, fetched with `cache: "reload"`), serves `index.html` for navigations (hash routing → offline app shell), matches cached files with `ignoreVary`, activates a waiting version on a `SKIP_WAITING` message, handles `periodicsync` for birthday reminders and opens the app on `notificationclick`. `workbox-build` (build time) and `workbox-window` (registration) are required peers of the plugin. The manifest (relative `id`, `start_url`, `scope`; PNG icons 192/512 plus maskable variants) is generated from `vite.config.ts`. Test PWA behavior with `npm run build && npm run preview`; the dev server has no service worker.

### IndexedDB
Persistent application data. Do not use localStorage as the primary database. The current implementation uses the native IndexedDB API with a small promise wrapper; Dexie is not needed unless it materially simplifies future work.

Multi-step writes run in one readwrite transaction. New code uses the repository's `inTransaction` helper, which aborts the transaction on any error; some older methods (e.g. `deletePerson`) open the transaction themselves and check everything before the first write. Either way nothing is written partially (see DATABASE.md → Write transactions). Schema changes bump `DATABASE_VERSION` and add a migration step in `database.ts` with a test that opens a frozen older database (`migration.test.ts`).

Call `navigator.storage.persist()` to request persistent storage (see PRODUCT.md §14).

### Theme
CSS custom properties for colors; `prefers-color-scheme` for the system default; a `data-theme` attribute on `<html>` when the user forces light/dark. The preference lives in IndexedDB metadata and is mirrored in `localStorage` (`giftlist.theme`) solely so `main.tsx` can apply it before the database opens (no flash of the system theme); the mirror is never read for anything else.

## Domain separation

Keep separate: UI components; application actions/use cases; domain types and pure logic (birthdays, sorting, filtering, plurals); persistence; import/export; notifications; PWA configuration.

Pure logic (birthday calculation, reminder evaluation, filtering, sorting, import validation) must be implemented as plain functions with unit tests, independent of React and IndexedDB.

Avoid enterprise-style overengineering.

## Structure

```text
src/
├── app/
├── components/
├── features/
│   ├── people/
│   ├── gifts/
│   ├── tags/
│   ├── notifications/
│   └── settings/
├── db/
├── domain/
├── lib/
├── styles/
├── sw/
└── types/
```

What lives where:
- `app/` — `App.tsx` (start, theme, bottom navigation, toast, reminders), `AppContext.ts` (`useApp()`: repository, metadata, `updatePreferences`, `reloadMetadata`, `showToast`, missed reminders), `routes.ts` (hash routes `#/…`, `navigate`, `goBack`, `replaceRoute`), `theme.ts`, `UpdateBanner.tsx` (service-worker registration, update banner, background-check sync);
- `components/` — shared UI: `Dialog` (native `<dialog>`), `ScreenHeader`, `Link`, `PersonAvatar`, `ReorderList` (`@dnd-kit`), `QuickAddButton`, icons;
- `features/<area>/` — screens and their helpers (people, gifts, tags, notifications, settings);
- `db/` — IndexedDB schema and migrations (`database.ts`), the repository (`repository.ts`), metadata defaults;
- `domain/` — entity types and pure logic: birthdays, reminders due, sorting, filters, links, photo crop math, backup validation and merge;
- `lib/` — small browser helpers: avatar rendering, photo decoding, plurals, formatting, `useLoad`, storage persistence, download;
- `sw/sw.ts` — the service worker (separate `tsconfig.sw.json`, WebWorker types);
- `types/` — ambient type declarations (Periodic Background Sync).

Conventions:
- Screens get data through `useApp().repository` and `useLoad(loader)`; there is no global store.
- Navigation uses hash routes so GitHub Pages needs no server rewrites; after saving, screens return with `goBack(fallback)` so the Android back button does not revisit forms.
- Repository methods validate input and throw Czech `Error` messages meant for the user; raw IndexedDB errors (`DOMException`) get a generic Czech message in the UI.
- Code shared with the service worker (`features/notifications/evaluate.ts`, `db/`, `domain/`) must not use `window` or DOM APIs.
- Tests sit next to the code (`*.test.ts`), IndexedDB is tested with `fake-indexeddb`.

The exact structure may be adjusted if it stays simple and coherent.

## IDs

Person, Gift, Tag, and GiftLink IDs are monotonically increasing positive integers with separate persistent counters (`highestPersonId`, `highestGiftId`, `highestTagId`, `highestGiftLinkId`). GiftTag associations are identified by `giftId` + `tagId`.

The counter represents the highest ID ever allocated; IDs are never reused. ID allocation and record creation happen in one transaction.

On import, imported IDs are preserved and counters advanced (never decreased).

## Dates

- Birthdays: `YYYY-MM-DD` or `--MM-DD` (year unknown), no timezone conversion.
- Timestamps: ISO 8601.
- Birthday calculations use local calendar dates, never UTC timestamp arithmetic.
- 29 February → 28 February in non-leap years.

## Import/export

Versioned JSON document, see DATABASE.md. Export downloads a file via a Blob and an `<a download>` link. Import reads a file chosen with `<input type="file" accept="application/json,.json">`.

Before any write: parse safely, validate the document and the merged result (schema version, records, enums, IDs, references, URLs, birthday format, tag uniqueness). If validation fails, do not modify the database. Perform all writes in one transaction.

## Birthday reminders

No reliable exact-time background scheduling exists for PWAs on Android without a push server. Therefore:
- reminders are evaluated on app start, on `visibilitychange` to visible, and hourly while open;
- system notifications are shown via `ServiceWorkerRegistration.showNotification()` (falls back to `new Notification()` where needed) when permission is granted;
- shown reminders are recorded in the `notificationLog` store; the "Zmeškané připomínky" card is built from its unseen entries (`seenAt = null`) and "Zavřít" marks them seen, so the card survives reloads and also shows reminders recorded by the background check;
- no Push API server, Firebase, OneSignal, cron, or other backend;
- the UI never claims delivery while the app is closed.

Periodic Background Sync is used as an optional enhancement where supported: while the setting is on, the app registers the `giftlist-birthday-reminders` tag (`minInterval` one day, `features/notifications/backgroundCheck.ts`) and unregisters it when the setting is off; the service worker handles `periodicsync` by running the same reminder logic (`features/notifications/evaluate.ts`) against IndexedDB and recording shown reminders in `notificationLog`. It must never be required; unsupported browsers keep evaluation on open. No server, push service, or secret is involved.

## Error handling

Friendly Czech messages. Never show raw database errors as the primary UI.

## Hosting

Static client-side app on GitHub Pages (HTTPS, required for PWA installation and notifications).

## Zero-cost and privacy constraints

Core runtime must not depend on an external HTTP API. Do not use remote fonts, CDN runtime dependencies, remote avatars, analytics, tracking, cloud databases, hosted authentication, or external notification providers. All application data remains local in IndexedDB.

## Backup and future synchronization

MVP implements only JSON export/import. A new phone is restored by importing a complete export into an empty installation. The repository abstraction leaves room for future synchronization; do not implement cloud sync, accounts, background data synchronization between devices, or conflict resolution in MVP. (The local Periodic Background Sync reminder check above is not data synchronization: nothing leaves the device.)
