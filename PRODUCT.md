# Product Specification

## 1. People

### Person fields

| Field | Required | Description |
|---|---|---|
| id | yes | Unique local monotonically increasing identifier; never reused after deletion |
| name | yes | Display name (trimmed, non-empty) |
| birthday | no | Calendar date of birth; the year may be unknown |
| avatarSeed | yes | Persistent seed for DiceBear Initial Face |
| photo | no | Optional photo (square JPEG, stored locally); shown instead of the avatar |
| sortOrder | yes | Position in the manual people order |
| createdAt | yes | Creation timestamp |
| updatedAt | yes | Last modification timestamp |

### Birthday input

The birthday is optional. The user enters day and month, and optionally the year ("Rok neznám" / year left empty).

- With year: stored as `YYYY-MM-DD`; age can be shown.
- Without year: stored as `--MM-DD`; no age is shown anywhere.

### Person actions

- Add
- Edit (name, birthday, avatar)
- Delete
- Open person's gift list
- Change avatar
- Upload, replace, or remove a photo (in the edit form)
- Reorder (in manual sort mode)

Changing name or birthday does not change the avatar seed (colors and face). Only the letter shown in the avatar follows the current name (see §16).

Deleting a person requires confirmation. If the person is a buyer on other people's gifts, the confirmation explicitly warns that those gifts remain but their buyer will be cleared.

## 2. Gifts

### Gift fields

| Field | Required | Description |
|---|---|---|
| id | yes | Unique local monotonically increasing identifier; never reused after deletion |
| personId | yes | Recipient; can be changed when editing |
| name | yes | Gift name |
| links | no | Multiple URLs |
| note | no | Free-form note |
| priority | yes | LOW, MEDIUM, HIGH; default MEDIUM |
| status | yes | NEW, BOUGHT, GIVEN; default NEW |
| buyerPersonId | no | Person who is expected to buy the gift |
| tagIds | no | Assigned tags, persisted as GiftTag associations |
| sortOrder | yes | Position in the recipient's manual gift order |
| createdAt | yes | Creation timestamp |
| updatedAt | yes | Last modification timestamp |

### Gift status behavior

- **NEW** — default. No label or icon in the normal gift list.
- **BOUGHT** — clear but subtle check icon. Gift remains visible.
- **GIVEN** — gift/given icon. Hidden from the default list, revealed by filtering.

A gift has exactly one status.

### Changing the recipient

When editing a gift, the recipient can be changed to another existing person. The gift keeps its ID, links, tags, buyer, note, priority, and status, and moves to the new recipient's list. This changes only this one record (it does not create a copy).

## 3. Multiple recipients

When adding a gift to multiple people, create a separate Gift record for each selected person.

Example: Lego → Child A, Lego → Child B. These are independent records. Changing the status, buyer, note, tags, links, recipient, or name for Child A does not change Child B's record. There is no later synchronization between the records.

## 4. Gift links

A gift may have zero or more links. Each link contains:
- a stable local identifier, never reused after deletion;
- URL (`http://` or `https://` only);
- optional display title, entered manually (the app does not fetch page titles — that would need a server because of CORS);
- order: a unique non-negative integer within the gift, normalized to `0..n-1`.

The user can add, edit, reorder (up/down), and remove links. Links open externally (new tab / browser). When the user types an address without a scheme (e.g. `alza.cz/lego`), `https://` is added; other schemes are rejected. All gift fields and its links are saved together in one transaction.

## 5. Priority

LOW, MEDIUM, HIGH. Default MEDIUM. The UI may use stars (1–3).

## 6. Buyers

"Kdo koupí" is optional and selected from existing people. A person may be both recipient and buyer. If the buyer is deleted, the gift is kept and `buyerPersonId` becomes `null`.

## 7. Tags

Users can create, rename, and delete tags and assign multiple tags to a gift.

Tag names are unique case-insensitively (trimmed, `toLocaleLowerCase("cs-CZ")`).

Each tag has a stable local ID never reused after deletion. Deleting a tag removes its associations but never deletes gifts.

Default tags on first initialization: Vánoce, Narozeniny, Výročí. They are ordinary tags and can be permanently deleted.

## 8. Filters (person detail)

### Status filter — exactly one is selected

| Filter | Shows |
|---|---|
| **Aktivní** (default) | NEW + BOUGHT |
| Koupeno | BOUGHT |
| Předáno | GIVEN |
| Vše | NEW + BOUGHT + GIVEN |

### Tag filter — zero or more tags

A gift must contain **all** selected tags.

### Combination

Status and tags combine with **AND**:
- Aktivní + Vánoce = NEW or BOUGHT, and tag Vánoce.
- Koupeno + Vánoce = BOUGHT and tag Vánoce.
- Aktivní + Vánoce + Narozeniny = NEW or BOUGHT, and both tags.

### Behavior

- Opening a person always starts with **Aktivní** and no tags (filters are not remembered).
- When any filter differs from the default, show a clear "Zrušit filtry" action.
- When nothing matches, show an empty state with "Zrušit filtry".

## 9. Sorting

### People list
Switch: **Abecedně** (default) / **Vlastní pořadí**.

### Gift list (per person)
Switch: **Podle priority** (default: HIGH → LOW, then newest first) / **Vlastní pořadí**. In both modes, given (Předáno) gifts are always shown last.

### Manual ordering
- In "Vlastní pořadí", an "Upravit pořadí" action enters reorder mode.
- In reorder mode each row shows a drag handle (⋮⋮); the user drags rows by the handle. Outside reorder mode, rows cannot be dragged (prevents conflicts with scrolling and tapping).
- "Hotovo" leaves reorder mode; the order is saved immediately after each drop.
- Keyboard/accessibility fallback: in reorder mode each row also has "Posunout nahoru" / "Posunout dolů" buttons.
- New people and gifts appear at the top of the manual order.
- In the gift list, reordering is available only with the filter "Vše" or "Aktivní" without tags, so the user always sees what they are moving.

The selected sort modes are remembered on the device.

## 10. Home / People screen

Bottom navigation: **Lidé | Nastavení**. There is no separate Gifts tab.

The People screen shows, in order:
1. **Zmeškané připomínky** card (only when there are any, see §12);
2. **Nadcházející narozeniny**;
3. **Lidé** list with sort switch;
4. prominent `+` quick-add button.

### Upcoming birthdays
- Birthdays from **today to today + 30 days** (inclusive), so a person who just got the 30-day reminder is in the list.
- Sorted by next occurrence.
- Each row: avatar, name, date, relative time ("dnes", "zítra", "za 12 dní"), and the upcoming age only when the year is known.
- People without a birthday are excluded.
- 29 February is treated as 28 February in non-leap years.

### People list rows
Avatar, name, and the number of **active** gifts (NEW + BOUGHT) with correct Czech plural forms: "0 dárků", "1 dárek", "2–4 dárky", "5+ dárků".

## 11. Quick add

```text
+
→ recipient(s)
→ gift name
→ Uložit
```

- At least one recipient and a non-empty name are required.
- New gifts get priority MEDIUM and status NEW.
- **New person inline:** the recipient picker contains "+ Nová osoba". It asks only for a name (birthday can be added later), creates the person, and preselects them.
- If no person exists yet, the flow opens directly with the "Nová osoba" field.
- Opening `+` from a person detail preselects that person.

Buttons:
- **Uložit** — creates one Gift per selected recipient and closes the flow.
- **Uložit a přidat další** — creates the records, opens a fresh form with the same recipient(s) preselected and focus in the name field.

Other metadata is added later through gift editing.

## 12. Birthday reminders

### Setting
One global setting in Nastavení: **Upozornění na narozeniny: zapnuto / vypnuto** (default off). No per-person setting.

### Reminder types
For each person with a birthday:
- **BEFORE_30** — due 30 days before the birthday occurrence;
- **DAY** — due on the birthday.

### When reminders are evaluated
Browsers/PWAs cannot reliably wake a closed app at an exact time. Therefore the app evaluates reminders **every time it is opened or becomes visible again** (and once a day while it stays open). Delivery while the app is completely closed is never promised.

### What is shown
On evaluation, the app finds reminders that are **due (due date ≤ today)**, **not yet shown** on this device (NotificationLog), and **still relevant**:
- BEFORE_30: relevant until the birthday itself (then replaced by DAY);
- DAY: relevant until 7 days after the birthday.

For the found reminders:
1. If notifications are enabled and permitted, show **one** system notification summarizing them (e.g. "Jana má narozeniny za 30 dní · Petr má dnes narozeniny"). Tapping it opens the app.
2. Show the **Zmeškané připomínky** card on the People screen listing each reminder (avatar, name, "za X dní" / "dnes" / "před X dny", age if known). The card has "Zavřít"; tapping a person opens their detail.
3. Record each reminder in NotificationLog so it is never shown again.

If the setting is off, nothing is evaluated or recorded.

### Notification permission
When the user turns the setting on, the app asks the browser for notification permission (the Android dialog "Povolit aplikaci GiftList zobrazovat oznámení?").
- **Allowed** → system notifications + in-app card.
- **Denied or dismissed** → the setting stays on; reminders appear only as the in-app card. Settings shows: "Systémová oznámení jsou zablokovaná. Připomínky uvidíte v aplikaci. Oznámení můžete povolit v nastavení telefonu." The app never asks repeatedly (browsers forbid it).
- **Unsupported** browser → the same in-app-only behavior with an explanatory note.

## 13. Empty states

Friendly empty states with a next action for: no people, person with no gifts, no filter results, no tags, no upcoming birthdays (one quiet line, not a large block).

## 14. Data management (Nastavení)

### Export
- "Exportovat data" creates a JSON file and **downloads** it as `giftlist-zaloha-YYYY-MM-DD.json` (on Android it goes to Stažené soubory / Downloads).
- After a successful export, store `lastExportAt`.
- Settings shows "Poslední záloha: před X dny" or "Zatím nezálohováno".
- When there is data and the last export is older than 30 days (or never), show a gentle hint on the Settings screen. No pop-ups.

### Import
- "Importovat data" opens a file picker (`.json`).
- The whole file and the merged result are validated before any write; on error nothing changes and a Czech message explains the problem.
- **Fresh installation** (no people and no gifts): import directly; existing tags are replaced by the imported ones.
- **Installation with data:** show a confirmation first:
  "Import sloučí data se stávajícími. Přepíše se X osob, Y dárků a Z tagů se stejným ID. Nic se nesmaže. Pokračovat?"
  plus a hint to export the current data first.
- After success, show a summary (added / updated counts).

Merge rules: see DATABASE.md.

### Storage persistence
On first start (and when the user saves the first person), the app calls `navigator.storage.persist()` so the browser does not evict data under storage pressure. Settings shows the result briefly ("Data jsou uložena trvale" / "Prohlížeč může data při nedostatku místa smazat — pravidelně zálohujte").

### Other
- The birthday-notification setting is persistent and included in export/import.
- There is **no global "Clear all data" action** in MVP.
- Individual people, gifts, and tags can be deleted.

## 15. Appearance

- Light and dark theme.
- Settings: **Vzhled: Podle systému (default) / Světlý / Tmavý**.
- Both themes must meet contrast requirements; the avatar colors must stay legible on both backgrounds.

## 16. Avatar

DiceBear 10.x, style `initial-face`, generated locally via `@dicebear/core` and `@dicebear/styles`. Never use the DiceBear HTTP API.

Each person gets an opaque random `avatarSeed` on creation. The same seed always produces the same avatar. "Změnit avatara" shows a small grid of variants generated from new random seeds; selecting one saves its seed. The seed is never derived from personal data.

Initial Face draws a letter as the mouth and would derive it from the seed. Because the seed is random, the app instead shows the first letter of the person's **current display name** (computed at render time, never stored). Colors and the face come only from the seed.

### Photo

A person may have an optional photo instead of the avatar. "Nahrát fotku" in the person form opens the system picker (on Android: camera or gallery). The user then positions the photo in a circular crop editor (drag to move; pinch, mouse wheel, or the "Přiblížení" slider to zoom 1–4×; arrow keys and +/− on a keyboard). The image always covers the whole circle. "Použít" renders the visible square at 256 × 256 px as JPEG locally in the browser and stores it in IndexedDB; it is never uploaded anywhere. Besides the cropped result, a downscaled original (shorter side 1024 px) and the crop position are stored, so "Změnit fotku" reopens the editor exactly where the user left off; the editor also offers "Vybrat jinou fotku". When a photo exists, it is shown everywhere instead of the avatar and "Změnit avatara" is not offered. "Odebrat fotku" removes it and the avatar from the unchanged seed is shown again. Photos are included in the backup.

## 17. Future sharing

Not in MVP. Recipient-specific Gift records are intentionally independent so future sharing can expose only one person's records.

## 18. Privacy and zero cost

Birthday and photos are personal data and are stored only locally. Display names may be first names, nicknames, or initials. Exported JSON is private. No runtime external service is required.

## 19. Backup versus synchronization

MVP provides **backup/migration, not synchronization**. Phone change: export on the old phone → transfer the file → import into the new empty app. Synchronization between two simultaneously used installations is out of scope; importing into a used installation is a merge with an explicit warning.
