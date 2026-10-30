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

Installed: React, Vite, TypeScript, ESLint, Vitest, fake-indexeddb, `@dicebear/core` + `@dicebear/styles`, `@dnd-kit/*`, `vite-plugin-pwa` (+ its required peers `workbox-build`, `workbox-window`).

Add when the phase needs them:
- `@dicebear/core`, `@dicebear/styles` — avatars (style `initial-face`);
- `vite-plugin-pwa` — service worker and offline shell;
- `@dnd-kit/core`, `@dnd-kit/sortable` — manual ordering.

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
- export/import validation;
- persistence after reload; offline CRUD.

## Data safety

Never make a destructive storage migration without understanding the existing schema and testing representative data. Preserve existing user data when changing storage structures. ID counters must never be reset or recomputed from existing records.

## Zero-cost release

GitHub Pages, GitHub Free, public repository, HTTPS, static build. No server runtime.

Do not commit personal data, exported backups (`giftlist-zaloha-*.json` belongs in `.gitignore`), secrets, API keys, or credentials.

## Privacy testing

Verify that no personal data is sent to a remote API, no analytics/tracking request is made, avatars are generated locally, and core CRUD plus export/import work offline.
