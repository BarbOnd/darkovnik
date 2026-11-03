# CLAUDE.md — GiftList (Dárkovník)

Instructions for Claude working on this repository. Read this file first in every session.

## Naming

The user-facing name of the app is **Dárkovník** (title, manifest, header, notifications, backup file name `darkovnik-zaloha-…`, texts). **GiftList** stays the working name in code, the repository, the IndexedDB database name, storage keys and documentation prose. Never rename internal identifiers: it would orphan existing user data.

## Source of truth

The Markdown files in this repository are the product and technical specification for GiftList:

| File | Contents |
|---|---|
| `PROJECT.md` | Purpose, principles, MVP scope |
| `PRODUCT.md` | Functional behavior |
| `DATABASE.md` | Data model, IndexedDB, import/export rules |
| `ARCHITECTURE.md` | Technology, layering, PWA, hosting |
| `UI.md` | Screens, interactions, design |
| `DEVELOPMENT.md` | Workflow, commands, definition of done |
| `TODO.md` | **The only phase plan.** Current progress and next steps |
| `README.md`, `SETUP.md` | Overview and quick start (summaries of the files above) |

Before implementing a substantial change:
1. Read `TODO.md` and find the current phase.
2. Read the relevant parts of `PRODUCT.md`, `DATABASE.md`, `UI.md`, and `ARCHITECTURE.md`.
3. Inspect the current implementation before changing it.

Do not silently change product requirements, data semantics, privacy rules, or architecture.

If a request conflicts with the documentation:
1. identify the conflict;
2. explain it briefly (in Czech when talking to the user);
3. propose the smallest reasonable change;
4. wait for confirmation when it affects product behavior, data integrity, privacy, cost, or architecture;
5. after confirmation, update the affected documentation in the same change as the code.

## Communication with the user

- The user communicates in Czech. Answer in Czech.
- Explain decisions in plain language; the user is not necessarily a developer.
- At the end of each phase, summarize in Czech: what changed, how to try it, what is left.

## Zero-cost contract — mandatory

The complete MVP must be buildable, runnable and deployable with **0 EUR/USD recurring cost**.

Do not introduce:
- paid APIs, hosting, databases, authentication, or notification services;
- paid SaaS or commercial SDKs requiring a subscription;
- proprietary APIs requiring an API key;
- analytics or tracking services;
- external services required for normal MVP operation.

No API keys or secrets are required for MVP.

Prefer browser-native APIs, open-source npm packages, locally bundled assets, and static hosting.

If an implementation would introduce a cost, API key, mandatory third-party runtime service, or vendor lock-in, **stop and report it before implementing**.

## Runtime network dependency

Core functionality must not depend on external HTTP APIs. After the app shell is cached, core CRUD works offline.

Do not introduce runtime CDN dependencies, remote fonts, remote avatar services, remote databases, remote authentication, analytics, tracking, or remote feature flags.

npm dependencies are allowed because they are bundled at build time.

## Implementation principles

- Prefer the smallest coherent implementation.
- Do not rewrite unrelated files.
- Do not add large dependencies without a clear reason. Allowed when needed: `vite-plugin-pwa` (with its required peers `workbox-build`, `workbox-window`), `@dicebear/core`, `@dicebear/styles`, `@dnd-kit/*` (manual ordering). Anything else: ask first.
- Do not create mock functionality that looks production-ready.
- Keep UI, domain/application logic, and persistence separated. The UI must not access IndexedDB directly.
- Preserve existing user data when changing storage structures; use IndexedDB version upgrades with migrations.
- Czech for user-facing text (including correct plural forms), English for code and storage names.
- Accessible semantic controls; clear confirmations for destructive actions.
- Mobile first: test narrow layouts (320 px) first. Support light and dark theme.
- System fonts and locally bundled assets only.
- Never edit text files with Windows PowerShell 5.1 `Get-Content`/`Set-Content` — it corrupts Czech UTF-8 text (see DEVELOPMENT.md → Windows environment notes).

## ID integrity is critical

This applies to **all entities with an ID: Person, Gift, Tag, GiftLink.**

- IDs are local, monotonically increasing positive integers.
- An ID is never reused, including after deletion. A deleted record leaves a permanent gap.
- Persistent counters live in IndexedDB metadata and represent the highest ID ever allocated.
- Never derive a new ID from the current maximum existing ID.
- Allocate the ID and create the record in one transaction.
- Import preserves imported IDs and advances counters; counters never decrease.

GiftTag associations have no own ID; they are identified by the `giftId` + `tagId` pair.

## Import semantics (summary — full rules in DATABASE.md)

- Import is a **merge by stable ID**, never a full replacement.
- Same ID locally → imported record wins. New ID → created with the original ID. Local records absent from the import stay untouched. Import never deletes, except default tags in a fresh installation.
- Validate the complete import **and** the resulting merged dataset before any write. On failure, write nothing and show a Czech error.
- If the installation already contains data, show a confirmation listing how many local records will be overwritten.

## Person deletion

Requires confirmation that warns when the person is a buyer on other people's gifts. On confirm: delete the person, their gifts and those gifts' links/tag associations, and the person's NotificationLog entries; set `buyerPersonId = null` on other gifts where they were buyer; never delete those other gifts.

## Avatar

DiceBear 10.x, style `initial-face`, generated locally via `@dicebear/core` + `@dicebear/styles`. Never call the DiceBear HTTP API.

Each person has an opaque random `avatarSeed` created on person creation. Never derive it from name, birthday, or other personal data. Changing name or birthday does not change the seed. "Změnit avatara" (person form only) picks another seed and saves it with the form. The letter in the avatar is the initial of the current name, injected at render time (never stored, never part of the seed) — see PRODUCT.md §16.

An optional person photo (with its downscaled source and crop) replaces the avatar everywhere; it is processed and stored only locally and included in the user's backup. Removing it shows the avatar from the unchanged seed again.

## Birthday reminders

Use only free browser/PWA capabilities. Never add Firebase, OneSignal, a server, cron, or another notification backend. Never claim guaranteed delivery while the app is closed. Reminders are evaluated when the app opens or becomes visible; Periodic Background Sync (Chromium Android, installed app) may additionally evaluate them roughly daily as an optional enhancement — never required, never promised. See PRODUCT.md §12.

## Privacy

No account, backend, analytics, tracking, or remote services. Person photos stay local (IndexedDB and the user's own backup file). Display names may be nicknames or initials. Export files are private user data. Never commit personal data, exported backups, secrets, or credentials.

## Phase-by-phase workflow

Work **one phase from `TODO.md` at a time**:
1. read the relevant documentation;
2. inspect the repository;
3. list the exact requirements of the phase;
4. implement only that phase;
5. run `npm run lint`, `npm test`, `npm run build` (the build runs the TypeScript check);
6. tick completed items in `TODO.md`;
7. report what changed and any remaining issue.

Do not start the next phase while the current phase is broken. Do not implement several phases in one giant change. Commit after each finished phase when the user agrees.

## Definition of done

- TypeScript strict checks, lint, relevant tests, and production build pass;
- works on a 320 px wide viewport in light and dark theme;
- persistence survives reload/restart;
- empty, loading and error states handled;
- destructive actions confirmed;
- import cannot partially modify data;
- no unrelated regression;
- no paid or mandatory external service introduced.

## Release hosting

GitLab Pages (gitlab.com, free tier), public repository, HTTPS, no custom domain, no server runtime. Deployment by the `pages` job in `.gitlab-ci.yml`.
