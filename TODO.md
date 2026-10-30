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

## Phase 2 — App shell and People

- [ ] App shell: bottom navigation Lidé / Nastavení, routing, system font stack
- [ ] Theme tokens, light/dark, `prefers-color-scheme`, `theme-color`
- [ ] Czech plural helper (dárek/dárky/dárků, den/dny/dní, rok/roky/let)
- [ ] People list with active gift count
- [ ] Sort switch Abecedně / Vlastní pořadí (persisted)
- [ ] Add person, edit person
- [ ] Birthday input: day, month, optional year
- [ ] Delete person with confirmation; warn when the person is a buyer
- [ ] DiceBear Initial Face avatar generated locally, persistent random seed
- [ ] Change avatar (variant grid)
- [ ] Empty state
- [ ] Verify no personal data is used as avatar seed

## Phase 3 — Gifts

- [ ] Person detail with gift list
- [ ] Add gift (multi-recipient → independent records)
- [ ] Edit gift incl. recipient change
- [ ] Delete gift with confirmation
- [ ] Priority (default MEDIUM), stars
- [ ] Optional buyer
- [ ] Multiple links (manual title, http/https only, reorder, open externally)
- [ ] Note
- [ ] Status; bought and given indicators
- [ ] Hide given gifts by default

## Phase 4 — Tags, filters, sorting

- [ ] Tag management in Settings: create, rename, delete with confirmation
- [ ] Assign multiple tags to a gift
- [ ] Status filter Aktivní (default) / Koupeno / Předáno / Vše
- [ ] Tag filter (all selected tags required), AND with status
- [ ] "Zrušit filtry"; filters reset when leaving the person
- [ ] Gift sort switch Podle priority / Vlastní pořadí (persisted)
- [ ] Reorder mode with drag handle (`@dnd-kit`) + up/down buttons, for people and gifts
- [ ] Empty states: no tags, no filter results

## Phase 5 — Quick add and UX polish

- [ ] Prominent `+` on People and person detail
- [ ] Quick add: recipients → name → Uložit
- [ ] "+ Nová osoba" inline; direct inline field when no people exist
- [ ] Uložit a přidat další (keep recipients, focus name)
- [ ] Preselect the person when opened from person detail
- [ ] Touch-friendly controls, accessible labels, focus states
- [ ] Loading / error / empty states
- [ ] Check 320 px layout in both themes

## Phase 6 — Birthdays and reminders

- [ ] Birthday logic: next occurrence, age (only with year), 29 Feb, local dates
- [ ] Upcoming birthdays today … today + 30
- [ ] Global toggle in Settings; permission request on enabling
- [ ] Reminder evaluation on start, on visibility change, daily while open
- [ ] Types BEFORE_30 and DAY, relevance windows, NotificationLog deduplication
- [ ] One summarizing system notification when permitted
- [ ] "Zmeškané připomínky" card on the People screen
- [ ] Denied/unsupported permission → in-app only + note in Settings
- [ ] Verify behavior on Android; document limitations
- [ ] No remote notification service

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
