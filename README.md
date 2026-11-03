# Dárkovník 🎁

Personal, mobile-first gift idea manager (PWA). All data stays on the device. "Dárkovník" is the user-facing name; the code, repository and database keep the working name GiftList.

## Features (MVP)

- People: name, optional birthday (year may be unknown), alphabetical or manual order
- Avatar: DiceBear Initial Face generated locally, or an optional photo with a circular crop editor
- Gifts for one or several people (an independent record per recipient)
- Quick add (`+`) incl. creating a new person, with optional details; on Android the installed app also receives shared pages from other apps
- Links, notes, priority, price with a per-list total, tags, optional buyer, changeable recipient
- Note per person (sizes, interests) and search across all gifts
- Status Nápad / Koupeno / Předáno; given gifts hidden by default and listed last
- Filters by status (Aktivní / Koupeno / Předáno / Vše) and tags with AND logic
- Sorting by priority or manually (drag handle or up/down buttons)
- Upcoming birthdays (today … +30 days) and birthday reminders: checked when the app is opened; optionally roughly daily in the background on Android (never guaranteed)
- Light and dark theme
- Export (download or system share sheet) and merge import; restore to a new phone via export/import
- Works offline, installable on Android

## Not in MVP

Accounts, login, cloud database, cloud sync, analytics, tracking, AI API, paid services, paid hosting, remote notification services.

## Zero cost & privacy

Hosted on GitHub Pages (GitHub Free) at `https://barbond.github.io/darkovnik/`, deployed by GitHub Actions on every push. No API keys. All data (incl. birthdays and photos) stays in the browser on the device; exported JSON files are private.

## Development

```bash
npm install
npm run dev        # development server (no service worker)
npm run lint
npm test
npm run build      # type check + production build
npm run preview    # production build incl. service worker / offline
```

Documentation (`CLAUDE.md` first):
- `CLAUDE.md` — rules for Claude
- `TODO.md` — the only phase plan and current progress
- `PROJECT.md` — purpose, principles, scope
- `PRODUCT.md` — functional behavior
- `DATABASE.md` — data model, migrations, backup and import rules
- `ARCHITECTURE.md` — technology, code structure, PWA
- `UI.md` — screens and interactions
- `DEVELOPMENT.md` — workflow, testing, environment notes
