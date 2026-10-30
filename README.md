# GiftList 🎁

Personal, mobile-first gift idea manager (PWA).

## MVP

- Manage people, alphabetical or manual order
- Optional birthdays (year may be unknown), stored locally
- DiceBear Initial Face avatars generated locally, manually changeable
- Add gifts for one or multiple people (independent record per recipient)
- Quick add incl. creating a new person
- Links, notes, priority, tags, optional buyer, changeable recipient
- Track bought gifts, hide given gifts by default
- Filter by status (Aktivní / Koupeno / Předáno / Vše) and tags with AND logic
- Sort gifts by priority or manually
- Upcoming birthdays (today + 30 days)
- Birthday reminders when the app is opened, with a summary of missed ones
- Light and dark theme
- Export (download) and merge import, last-backup indicator
- Restore to a new phone via export/import
- Works offline, installable on Android

## Not in MVP

Accounts, login, cloud database, cloud sync, analytics, tracking, AI API, paid services, paid hosting, remote notification services.

## Zero cost & privacy

Hosted on GitHub Pages (GitHub Free). No API keys. All data stays in the browser on the device; exported JSON files are private.

## Development

```bash
npm install
npm run dev
```

Documentation:
- `CLAUDE.md` — rules for Claude (read first)
- `TODO.md` — phase plan and progress
- `PROJECT.md`, `PRODUCT.md`, `DATABASE.md`, `ARCHITECTURE.md`, `UI.md`, `DEVELOPMENT.md`, `SETUP.md`
