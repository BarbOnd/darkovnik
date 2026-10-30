# TODO

The only phase plan for GiftList. Work one phase at a time (see `CLAUDE.md`).

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
- [x] Reminder evaluation on start, on visibility change, daily while open
- [x] Types BEFORE_30 and DAY, relevance windows, NotificationLog deduplication
- [x] One summarizing system notification when permitted
- [x] "Zmeškané připomínky" card on the People screen
- [x] Denied/unsupported permission → in-app only + note in Settings
- [ ] Verify behavior on Android (needs a device; after phase 8 for system notifications) — limitations documented in PRODUCT.md §12
- [x] No remote notification service

## Phase 7 — Backup

- [ ] Export JSON download `giftlist-zaloha-YYYY-MM-DD.json`, store `lastExportAt`
- [ ] "Poslední záloha" info and gentle reminder after 30 days
- [ ] Import from file picker
- [ ] Validate document and merged result before writes; unsupported schema version
- [ ] Merge by stable ID; no deletion; counters advanced
- [ ] Fresh installation: replace tags with imported tags
- [ ] Non-fresh installation: overwrite-count confirmation
- [ ] Link order normalization after merge
- [ ] Result summary (added / updated)
- [ ] `navigator.storage.persist()` and its status in Settings
- [ ] Test the complete phone-migration flow into an empty app

## Phase 8 — PWA and offline

- [ ] `vite-plugin-pwa`, service worker, offline app shell
- [ ] Update banner "Je dostupná nová verze" (registerType prompt)
- [ ] Periodic Background Sync for birthday reminders (optional; Chromium Android, installed app), shared reminder logic, honest note in Settings
- [ ] Maskable icon, manifest with relative `start_url`/`scope`
- [ ] Test installation on Android, standalone mode
- [ ] Test offline CRUD and persistence after restart
- [ ] Verify no runtime external API is required

## Phase 9 — Release

- [ ] Set `base` in `vite.config.ts` to `/<repository-name>/`
- [ ] GitHub Actions workflow deploying to GitHub Pages
- [ ] Verify HTTPS
- [ ] Install and test on Android
- [ ] Test export/import on the device
- [ ] Confirm repository contains no personal data, backups, secrets, or API keys
