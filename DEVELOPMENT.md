# Development Guide

## Goal

Develop GiftList with Claude in small, reviewable steps. Claude's working rules are in `CLAUDE.md`; the phase plan is in `TODO.md`.

## Prerequisites

- Node.js LTS
- npm
- Git
- VS Code
- Claude Code (VS Code extension or terminal) opened in the repository root, so `CLAUDE.md` is loaded automatically

## Commands

```bash
npm install
npm run dev        # development server
npm run lint       # ESLint
npm test           # Vitest (single run)
npm run test:watch # Vitest watch mode
npm run build      # TypeScript check + production build
npm run preview    # serve the production build locally (service worker, offline, update banner)
```

## Dependencies

Installed (all free and open source, bundled at build time):
- React, Vite, TypeScript, ESLint, Vitest, `fake-indexeddb` (tests);
- `@dicebear/core`, `@dicebear/styles` — avatars (style `initial-face`, CC0);
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@dnd-kit/modifiers` — manual ordering;
- `vite-plugin-pwa` + its required peers `workbox-build` (build time) and `workbox-window` (registration).

Do not install other libraries without a clear reason and the user's agreement.

## Working with Claude

A typical prompt for a phase:

> Pokračuj fází X z TODO.md. Nejdřív si přečti relevantní dokumentaci a aktuální kód, vypiš požadavky fáze a pak ji implementuj. Na konci spusť lint, testy a build a shrň změny.

Rules (details in `CLAUDE.md`):
1. one phase at a time;
2. smallest coherent change, no unrelated rewrites;
3. lint, tests, and build must pass before moving on;
4. tick finished items in `TODO.md`;
5. commit after each finished phase.

The phase plan lives **only** in `TODO.md`.

## Definition of done

A feature is complete when:
- it works on a 320 px wide viewport in light and dark theme;
- TypeScript strict checks, lint, relevant tests, and production build pass;
- persistence survives reload/restart;
- empty, loading and error states are handled;
- destructive actions are confirmed;
- import validation prevents partial writes;
- no unrelated behavior regresses;
- no paid or mandatory external service was introduced.

## Testing priorities

High priority:
- people CRUD; person deletion with buyer references;
- gift CRUD; recipient change; multi-recipient creation; independent records;
- buyer assignment and clearing;
- tag CRUD; case-insensitive uniqueness;
- status and tag filtering with AND logic; "Vše"; given hidden by default;
- sorting (alphabetical cs-CZ, priority, manual) and sortOrder persistence;
- monotonically increasing IDs; deleted IDs never reused;
- import merge by ID; no deletion; counters advanced; fresh-installation tag replacement; link order normalization; overwrite counts;
- avatar seed persistence and change;
- birthday calculation incl. unknown year, 29 February, year boundary, timezones;
- reminder evaluation: due, relevance window, deduplication via NotificationLog;
- Czech plural forms;
- export/import validation; the complete phone-migration flow (`src/db/backup.test.ts`);
- IndexedDB migrations from every older version (`src/db/migration.test.ts`);
- photo fields and crop math;
- persistence after reload; offline CRUD.

## How changes are verified

- Unit and repository tests: `npm test` (tests sit next to the code as `*.test.ts`; IndexedDB via `fake-indexeddb`).
- UI: check 320 px width in light and dark theme. The user's main test environment is Firefox and VS Code's browser on Windows with **125 % display scaling** — canvas and pixel-size code must also be checked at device pixel ratio 1.25 and 1.5 (a crop-preview bug appeared only there).
- PWA (service worker, offline, update banner, background check): only in `npm run build` + `npm run preview`, not in `npm run dev`. Offline is verified by stopping the preview server and reloading. Headless Firefox did not complete service-worker installs in automation; headless Edge/Chrome (DevTools protocol) works, and can also dispatch a `periodicsync` event.
- Things that need a real Android phone (installation, standalone mode, real daily background check, system notifications) are listed as open items in `TODO.md`.

## Icons

`public/icons/giftlist.svg` (rounded square, transparent corners) and `giftlist-maskable.svg` (full-bleed) are the sources; `src/assets/logo.svg` is a copy used in the app header. The PNG sizes (192/512, both variants) are rendered from the SVGs with headless Edge: an HTML page containing `<img src="….svg" width=N height=N>` is screenshotted with `--headless=new --window-size=N,N --default-background-color=00000000 --screenshot=…` (a temporary `--user-data-dir` per run). Re-render all four after changing an SVG.

## Windows environment notes

- Do **not** edit text files with Windows PowerShell 5.1 (`Get-Content` / `Set-Content`): it reads UTF-8 without BOM as the ANSI code page and corrupts Czech characters (this happened twice). Use the editor, Claude's Edit/Write tools, or Git Bash `sed`. After scripted edits check for mojibake (`Ă`, `Ä`, `Ĺ`, `â€`) and a BOM (`ef bb bf`).
- Git warns "LF will be replaced by CRLF" on commit; this is harmless (`core.autocrlf=true`).

## Data safety

Never make a destructive storage migration without understanding the existing schema and testing representative data. Preserve existing user data when changing storage structures. ID counters must never be reset or recomputed from existing records.

## Zero-cost release

GitHub Pages, GitHub Free, public repository, HTTPS, static build. No server runtime.

Do not commit personal data, exported backups (`darkovnik-zaloha-*.json` belongs in `.gitignore`), secrets, API keys, or credentials.

## Privacy testing

Verify that no personal data is sent to a remote API, no analytics/tracking request is made, avatars are generated locally, and core CRUD plus export/import work offline.
