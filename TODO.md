# TODO

The only phase plan for GiftList. Work one phase at a time (see `CLAUDE.md`).

**Current status:** phases 0–8 are implemented and committed (each phase has its own commit). Open: checks that need a real Android phone (phases 6 and 8) and phase 9 (release). Next step: phase 9.

Phases 2b and the quick-add details were added on the user's request during development; their decisions are recorded in `PRODUCT.md`.

## Phase 0 — Project setup ✅

- [x] Create Vite + React + TypeScript project
- [x] Initialize Git repository
- [x] Add project documentation
- [x] Configure TypeScript strict mode
- [x] Configure linting
- [x] Add test framework (Vitest)
- [x] Add PWA manifest and icon (service worker in Phase 8)
- [x] Confirm production build
- [x] Confirm no runtime CDN dependency

## Phase 1 — Data layer ✅

- [x] Define domain types
- [x] Set up IndexedDB
- [x] Add schema version
- [x] Add repository/storage abstraction
- [x] Persistent ID counters for people, gifts, tags, gift links
- [x] Ensure deleted IDs are never reused
- [x] Add initial default tags
- [x] Test persistence after reload

## Phase 1b — Data layer update after spec review ✅

- [x] Replace `CODEX.md` by `CLAUDE.md` (delete `CODEX.md`)
- [x] Add `giftlist-zaloha-*.json` to `.gitignore`
- [x] IndexedDB version 2 migration (DATABASE.md → Schema migrations)
- [x] `Person.sortOrder`, `Gift.sortOrder` (new records at the top)
- [x] Birthday format `YYYY-MM-DD` or `--MM-DD` + validation helper
- [x] Metadata: `lastExportAt`, `peopleSortMode`, `giftSortMode`, `theme`
- [x] `notificationLog` store with `personId` index; delete entries with the person
- [x] Trim person name; validate priority/status enums in the repository
- [x] Repository: `updatePerson`, `updateGift` (incl. recipient change), `renameTag`, `listGiftsByPerson`, gift links update/reorder/remove with `0..n-1` normalization, `setGiftTags`, reorder people/gifts, update preferences
- [x] `isFreshInstallation()` (no people and no gifts)
- [x] Tests for all of the above incl. v1 → v2 migration

## Phase 2 — App shell and People ✅

- [x] App shell: bottom navigation Lidé / Nastavení, routing, system font stack
- [x] Theme tokens, light/dark, `prefers-color-scheme`, `theme-color`
- [x] Czech plural helper (dárek/dárky/dárků, den/dny/dní, rok/roky/let)
- [x] People list with active gift count
- [x] Sort switch Abecedně / Vlastní pořadí (persisted)
- [x] Add person, edit person
- [x] Birthday input: day, month, optional year
- [x] Delete person with confirmation; warn when the person is a buyer
- [x] DiceBear Initial Face avatar generated locally, persistent random seed
- [x] Change avatar (variant grid)
- [x] Empty state
- [x] Verify no personal data is used as avatar seed

## Phase 2b — Person photo ✅

- [x] `Person.photo` (JPEG data URL or null), IndexedDB version 3 migration (`photo: null`)
- [x] Validate photo format and size in the repository
- [x] Photo upload in the person form (Android: camera or gallery), resized/cropped locally to 256×256 JPEG
- [x] Circular crop editor: move (drag, arrows) and zoom (pinch, wheel, slider, +/−) before saving
- [x] Store the downscaled source photo and crop (IndexedDB version 4); "Změnit fotku" reopens the editor with the saved crop; "Vybrat jinou fotku" in the editor
- [x] Remove photo; the DiceBear avatar (unchanged seed) is shown again
- [x] Photo shown instead of the avatar everywhere
- [x] Docs: PRODUCT, DATABASE (incl. backup and import validation), UI, CLAUDE
- [x] Tests incl. v2 → v3 migration

## Phase 3 — Gifts ✅

- [x] Person detail with gift list
- [x] Add gift (multi-recipient → independent records)
- [x] Edit gift incl. recipient change
- [x] Delete gift with confirmation
- [x] Priority (default MEDIUM), stars
- [x] Optional buyer
- [x] Multiple links (manual title, http/https only, reorder, open externally)
- [x] Note
- [x] Status; bought and given indicators
- [x] Hide given gifts by default

## Phase 4 — Tags, filters, sorting ✅

- [x] Tag management in Settings: create, rename, delete with confirmation
- [x] Assign multiple tags to a gift
- [x] Status filter Aktivní (default) / Koupeno / Předáno / Vše
- [x] Tag filter (all selected tags required), AND with status
- [x] "Zrušit filtry"; filters reset when leaving the person
- [x] Gift sort switch Podle priority / Vlastní pořadí (persisted)
- [x] Reorder mode with drag handle (`@dnd-kit`) + up/down buttons, for people and gifts
- [x] Empty states: no tags, no filter results

## Phase 5 — Quick add and UX polish ✅

- [x] Prominent `+` on People and person detail
- [x] Quick add: recipients → name → Uložit; optional collapsed "Další podrobnosti" (same fields as editing)
- [x] "+ Nová osoba" inline; direct inline field when no people exist
- [x] Uložit a přidat další (keep recipients, focus name)
- [x] Preselect the person when opened from person detail
- [x] Touch-friendly controls, accessible labels, focus states
- [x] Loading / error / empty states
- [x] Check 320 px layout in both themes

## Phase 6 — Birthdays and reminders

- [x] Birthday logic: next occurrence, age (only with year), 29 Feb, local dates
- [x] Upcoming birthdays today … today + 30
- [x] Global toggle in Settings; permission request on enabling
- [x] Reminder evaluation on start, on visibility change, hourly while open
- [x] Types BEFORE_30 and DAY, relevance windows, NotificationLog deduplication
- [x] One summarizing system notification when permitted
- [x] "Zmeškané připomínky" card on the People screen
- [x] Denied/unsupported permission → in-app only + note in Settings
- [ ] Verify behavior on Android (needs a device; after phase 8 for system notifications) — limitations documented in PRODUCT.md §12
- [x] No remote notification service

## Phase 7 — Backup ✅

- [x] Export JSON download `giftlist-zaloha-YYYY-MM-DD.json`, store `lastExportAt`
- [x] "Poslední záloha" info and gentle reminder after 30 days
- [x] Import from file picker
- [x] Validate document and merged result before writes; unsupported schema version
- [x] Merge by stable ID; no deletion; counters advanced
- [x] Fresh installation: replace tags with imported tags
- [x] Non-fresh installation: overwrite-count confirmation
- [x] Link order normalization after merge
- [x] Result summary (added / updated)
- [x] `navigator.storage.persist()` and its status in Settings
- [x] Test the complete phone-migration flow into an empty app (automated test src/db/backup.test.ts + manual import check in Firefox; a real second phone after phase 9)

## Phase 8 — PWA and offline

- [x] `vite-plugin-pwa`, service worker, offline app shell
- [x] Update banner "Je dostupná nová verze" (registerType prompt)
- [x] Periodic Background Sync for birthday reminders (optional; Chromium Android, installed app), shared reminder logic, honest note in Settings (verified by dispatching periodicsync in Edge; real daily wake-up on Android pending)
- [x] Maskable icon, manifest with relative `start_url`/`scope`
- [ ] Test installation on Android, standalone mode (needs a device; after phase 9 on HTTPS)
- [x] Test offline CRUD and persistence after restart (desktop Edge with the server stopped: reload, deep link, data kept; repeat on Android)
- [x] Verify no runtime external API is required

## Review fixes after phase 8 ✅

- [x] "Zmeškané připomínky" built from NotificationLog (`seenAt`, IndexedDB version 5): survives reloads, shows reminders from the background check, "Zavřít" marks them seen
- [x] Forced theme applied before the first render (localStorage mirror), no flash of the system theme
- [x] Gift row: "open link" shortcut and one-line note preview
- [x] After changing a gift's recipient, open the new recipient's list with a toast
- [x] Version 1.0.0 in package.json ("O aplikaci"), `apple-touch-icon` for iOS
- [x] Docs: PRODUCT §2/§12, DATABASE (NotificationLog, migration v5, theme mirror), UI, ARCHITECTURE

## Phase 10 — Improvements from the review (part 1, no schema change) ✅

- [x] Android share target: shared page → quick add prefilled (link + name), `share_target` in the manifest
- [x] "Sdílet zálohu" through the system share sheet (Web Share API, `.txt`), import accepts `.txt`
- [x] Active gift count in "Nadcházející narozeniny" rows
- [x] "Předáno YYYY" in the gift row
- [x] Duplicate hint in quick add (same name for a selected recipient)
- [ ] Verify the share sheet entry and backup sharing on Android (after phase 9)

## Phase 11 — Improvements from the review (part 2, schema version 6)

- [ ] Person note (sizes, interests, what they already have)
- [ ] Gift price / budget, sum per person
- [ ] Search across all gifts from the People screen

## Phase 9 — Release

- [ ] Decide with the user before the first push: repository name (→ `base`) and the commit author e-mail (all commits so far use the user's work e-mail, which becomes public; it can be rewritten to the GitHub noreply address only before pushing)
- [ ] User creates an empty public GitHub repository (the `gh` CLI is not installed); add it as `origin`; local branch is `master`
- [ ] Set `base` in `vite.config.ts` to `/<repository-name>/` and check icons, manifest and service worker under that path (`npm run build` + `npm run preview`)
- [ ] GitHub Actions workflow deploying to GitHub Pages
- [ ] Verify HTTPS
- [ ] Install and test on Android (incl. the open items of phases 6 and 8: system notifications, standalone mode, background check)
- [ ] Test export/import on the device
- [ ] Confirm repository contains no personal data, backups, secrets, or API keys
