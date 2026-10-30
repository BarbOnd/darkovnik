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
Build tool and development server. For GitHub Pages, `base` in `vite.config.ts` must be set to `/<repository-name>/` (set in the release phase; the manifest `start_url` and `scope` must be relative so they follow `base`).

### React
UI and component model.

### TypeScript
Strict mode. Avoid `any` unless there is a documented reason.

### PWA
The application must:
- provide a web app manifest with icons (incl. a maskable icon for Android);
- support installation on Android, standalone display mode;
- cache the application shell for offline use;
- work correctly after installation.

Use `vite-plugin-pwa` (open source, Workbox-based) with `registerType: "prompt"`: when a new version is available, the UI offers "Načíst znovu" instead of reloading silently.

### IndexedDB
Persistent application data. Do not use localStorage as the primary database. The current implementation uses the native IndexedDB API with a small promise wrapper; Dexie is not needed unless it materially simplifies future work.

Call `navigator.storage.persist()` to request persistent storage (see PRODUCT.md §14).

### Theme
CSS custom properties for colors; `prefers-color-scheme` for the system default; a `data-theme` attribute on `<html>` when the user forces light/dark.

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
└── types/
```

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
- reminders are evaluated on app start, on `visibilitychange` to visible, and once a day while open;
- system notifications are shown via `ServiceWorkerRegistration.showNotification()` (falls back to `new Notification()` where needed) when permission is granted;
- shown reminders are recorded in the `notificationLog` store;
- no Push API server, Firebase, OneSignal, cron, or other backend;
- the UI never claims delivery while the app is closed.

Periodic Background Sync is used as an optional enhancement where supported (phase 8): the service worker registers a daily `periodicsync` tag and runs the same pure reminder logic against IndexedDB, recording shown reminders in `notificationLog`. It must never be required; unsupported browsers keep evaluation on open. No server, push service, or secret is involved.

## Error handling

Friendly Czech messages. Never show raw database errors as the primary UI.

## Hosting

Static client-side app on GitHub Pages (HTTPS, required for PWA installation and notifications).

## Zero-cost and privacy constraints

Core runtime must not depend on an external HTTP API. Do not use remote fonts, CDN runtime dependencies, remote avatars, analytics, tracking, cloud databases, hosted authentication, or external notification providers. All application data remains local in IndexedDB.

## Backup and future synchronization

MVP implements only JSON export/import. A new phone is restored by importing a complete export into an empty installation. The repository abstraction leaves room for future synchronization; do not implement cloud sync, accounts, background sync, or conflict resolution in MVP.
