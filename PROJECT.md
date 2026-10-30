# GiftList

## Purpose

GiftList is a personal, mobile-first Progressive Web App (PWA) for quickly saving and organizing gift ideas for different people.

Primary use case:

> Think of a gift idea → open GiftList on the phone → add it in a few seconds → continue with the day.

The application is personal and local-first. It has no accounts, login, backend database, cloud synchronization, or AI API in MVP.

## Product principles

1. **Fast first** — adding a gift takes only a few seconds.
2. **Mobile first** — primary device is an Android phone.
3. **Minimalist** — clean UI, restrained visual language, good typography, light and dark theme.
4. **Offline first** — core functionality works without internet access.
5. **Local data** — data is stored locally on the device/browser.
6. **Privacy by design** — names and birthdays stay local; no tracking or analytics.
7. **Zero cost** — no recurring service cost and no required paid dependency.
8. **Simple data model** — understandable structures over premature abstraction.
9. **Future-friendly** — room for future sync and sharing, not implemented in MVP.

## Zero-cost architecture

The MVP is fully usable without paid hosting, paid APIs, paid databases, paid notification services, accounts, analytics, or API keys.

Stack: React, TypeScript, Vite, PWA (`vite-plugin-pwa`), IndexedDB, locally bundled DiceBear, static hosting on GitHub Pages (GitHub Free).

## Privacy

Birthdays and person photos are personal data stored only in the browser's IndexedDB. Users may use first names, nicknames, initials, or any display name. Exported JSON backups are private files.

## MVP scope

### People
- add, edit, delete;
- display name;
- optional birthday, year may be unknown;
- deterministic DiceBear Initial Face avatar, manually changeable;
- optional photo instead of the avatar (circular crop editor, stored locally);
- alphabetical or manual order.

### Gifts
- recipient (changeable), name, links, note, priority (default MEDIUM), tags, optional buyer, one status;
- `NEW` (no indicator), `BOUGHT` (subtle check), `GIVEN` (hidden by default, listed last);
- sorted by priority or manually.

### Multiple recipients
One gift idea for several recipients creates independent Gift records, one per recipient, with no later synchronization.

### Quick add
Recipient(s) → name → save, including creating a new person inline. Optional details (buyer, priority, tags, links, note, status) can be filled in a collapsed section before saving.

### Backup and phone migration
JSON export (download) / merge import. Phone change: export → transfer file → import into the new empty app. Persistent storage is requested and the app shows when the last backup was made.

## Birthday reminders

- Upcoming birthdays: today to today + 30 days.
- Reminders 30 days before and on the day, evaluated whenever the app is opened or shown; on Android an installed app may also be checked roughly daily in the background (Periodic Background Sync, optional, never guaranteed).
- Missed reminders are summarized in a "Zmeškané připomínky" card.
- Never claims guaranteed delivery while the app is closed; no remote notification service.

## Navigation

Bottom navigation: Lidé | Nastavení. No separate Gifts tab; gifts are accessed through a person's detail.

## Offline

After the app shell is cached, these work offline: people, gifts, tags, filters, sorting, reminders, export, import.
