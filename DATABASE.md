# Data Model

GiftList uses IndexedDB as its local persistent database.

## Entities

### Person

```text
Person
- id: number
- name: string                  // trimmed, non-empty
- birthday: string | null       // "YYYY-MM-DD" or "--MM-DD" (year unknown)
- avatarSeed: string
- photo: string | null          // cropped square 256×256 JPEG "data:image/jpeg;base64,…" URL, or null
- photoSource: string | null    // downscaled original JPEG data URL (shorter side ≤ 1024 px) for re-editing
- photoCrop: { zoom, dx, dy } | null  // crop position in photoSource, viewport units (zoom 1–4)
- note: string                  // free-form note, trimmed; "" when empty
- sortOrder: number             // manual order among people
- createdAt: string             // ISO-8601
- updatedAt: string             // ISO-8601
```

`birthday` is a calendar date, not a timestamp. When the year is unknown, it is stored in the ISO 8601 partial form `--MM-DD` (e.g. `--05-14`). Such a person takes part in upcoming birthdays and reminders, but no age is shown.

`avatarSeed` is an opaque seed for DiceBear Initial Face and must not contain personal data.

`photo`, `photoSource`, and `photoCrop` are either all set or all null.

### Gift

```text
Gift
- id: number
- personId: number              // recipient; may be changed when editing
- name: string
- note: string
- priority: "LOW" | "MEDIUM" | "HIGH"   // default MEDIUM
- status: "NEW" | "BOUGHT" | "GIVEN"    // default NEW
- buyerPersonId: number | null
- price: number | null          // CZK, 0 ≤ price ≤ 100 000 000, at most two decimals; null = unknown
- sortOrder: number             // manual order within the recipient's gift list
- createdAt: string
- updatedAt: string
```

A Gift belongs to exactly one recipient.

### GiftLink

```text
GiftLink
- id: number
- giftId: number
- url: string                   // http:// or https:// only
- title?: string                // optional, entered manually
- sortOrder: number             // unique non-negative integer within one gift
```

### Tag

```text
Tag
- id: number
- name: string
- createdAt: string
- updatedAt: string
```

### GiftTag

```text
GiftTag
- giftId: number
- tagId: number
```

## Relationships

```text
Person 1 ──── * Gift
Person 1 ──── * Gift (as optional buyer)

Gift 1 ──── * GiftLink

Gift * ──── * Tag
          via GiftTag
```

## Multiple recipients

There is deliberately no many-to-many Gift-to-Person relation.

Selecting multiple recipients creates multiple independent Gift records.

## Referential behavior

When deleting a Person:
- delete the person's gift records after confirmation;
- delete their GiftLinks;
- delete GiftTag associations for those gifts;
- set `buyerPersonId` to null on other gifts where this person was the buyer;
- keep those other gifts;
- delete the person's NotificationLog entries.

When deleting a Gift:
- delete its links;
- delete its GiftTag associations.

When deleting a Tag:
- delete its GiftTag associations;
- keep all gifts.

When changing a gift's recipient:
- the gift keeps its ID, links, tags, buyer, and status;
- it is appended at the top of the new recipient's manual order.

## IndexedDB stores

```text
people
gifts
giftLinks
tags
giftTags
metadata
notificationLog
```

Indexes:
- gifts by personId;
- gifts by status;
- gifts by buyerPersonId;
- giftLinks by giftId;
- giftTags by giftId;
- giftTags by tagId;
- notificationLog by personId.

## Metadata

The `metadata` store holds one application record:

```text
- key: "app"                   // the single record's key
- schemaVersion: number        // IndexedDB schema version (currently 6); NOT the backup file version
- initializationComplete: boolean   // set when the default tags were created on first start
- highestPersonId: number
- highestGiftId: number
- highestTagId: number
- highestGiftLinkId: number
- birthdayNotificationsEnabled: boolean
- lastExportAt: string | null           // ISO-8601, set after a successful export
- peopleSortMode: "ALPHABETICAL" | "MANUAL"   // default ALPHABETICAL
- giftSortMode: "PRIORITY" | "MANUAL"         // default PRIORITY
- theme: "SYSTEM" | "LIGHT" | "DARK"          // default SYSTEM
```

ID counters must never decrease after deletion. This applies to people, gifts, tags, and gift links. The counter represents the highest ID ever allocated, not the current maximum record ID.

`lastExportAt`, `peopleSortMode`, `giftSortMode`, and `theme` are device preferences and are **not** exported. `theme` is additionally mirrored in `localStorage` (`giftlist.theme`) only so the forced theme applies before the database opens; IndexedDB remains the source of truth.

## NotificationLog

Remembers which birthday reminders were already shown on this device, so a reminder is never shown twice, and which of them the user has already closed in the app.

```text
NotificationLog
- key: string           // "<personId>:<type>:<occurrenceDate>", e.g. "12:DAY:2026-05-14"
- personId: number
- type: "BEFORE_30" | "DAY"
- occurrenceDate: string   // YYYY-MM-DD of the birthday occurrence it belongs to
- shownAt: string          // ISO-8601, when the reminder was recorded (notification shown)
- seenAt: string | null    // ISO-8601, when the user closed it in the "Zmeškané připomínky" card; null until then
```

NotificationLog is device-local and is **not** exported. Recording reminders is atomic: only keys not yet present are recorded and shown (so two open windows or the background check never show one reminder twice); entries of deleted people are skipped. Entries older than about one year (366 days) are removed when new reminders are recorded.

The "Zmeškané připomínky" card lists every entry with `seenAt = null` (joined with the current people; entries of deleted people are skipped), so reminders recorded by the background check or in a previous session are not lost. "Zavřít" sets `seenAt` on the listed entries.

## Sorting

### People
- `ALPHABETICAL`: by `name` using `localeCompare(…, "cs-CZ")`, ties by `id`.
- `MANUAL`: by `sortOrder` ascending.

### Gifts (within one recipient)
- `PRIORITY`: HIGH → MEDIUM → LOW, then `createdAt` descending (newest first), ties by `id`.
- `MANUAL`: by `sortOrder` ascending.

In the displayed list, GIVEN gifts always come last (after NEW and BOUGHT); the sort mode applies within each group. The stored `sortOrder` is not changed by this.

`sortOrder` is maintained in both modes so switching to MANUAL never loses an order. New records get a `sortOrder` that places them **at the top** of the manual order. After reordering or deleting, sortOrders may be normalized to `0..n-1`; gaps are allowed in between.

## ID scope and import

Person, Gift, Tag, and GiftLink IDs are **local stable identifiers within an installation/export history**. They are not globally unique.

MVP does not provide cross-device synchronization.

For backup/phone migration, export the complete dataset and import it into the new empty installation. Imported IDs are preserved and local counters are advanced without ever decreasing.

## Default tags

On first initialization, create:
- Vánoce
- Narozeniny
- Výročí

They are normal editable tags and can be permanently deleted. Do not silently recreate a deleted default tag.

## Fresh installation

An installation is **fresh** when it contains **no people and no gifts**.

When importing into a fresh installation, first delete all existing tags (these can only be the default tags or tags the user created without using them) together with their GiftTag associations (there can be none). The imported tags then become the installation's tags.

An import into a non-fresh installation follows the normal merge rules and deletes nothing.

## Tag names

Tag names are unique, compared case-insensitively using the trimmed name converted with `toLocaleLowerCase("cs-CZ")`. No additional Unicode normalization is required for MVP.

## GiftLink order

`sortOrder` is a unique non-negative integer within one gift. When links are created, reordered, or removed, store their order consecutively as `0..n-1`. Link titles are trimmed; an empty title is not stored.

## Write transactions

Every multi-step write (create gifts for several recipients with links and tags, save a gift with its links and tags, delete a person, import) runs in **one** IndexedDB transaction. References are checked before the first write, and any error aborts the transaction, so nothing is written partially.

## Backup schema

The backup file has its own format version `schemaVersion: 1`, independent of the IndexedDB version. A file with a higher version is refused ("Záloha pochází z novější verze aplikace…").

```json
{
  "schemaVersion": 1,
  "exportedAt": "ISO-8601 timestamp",
  "people": [],
  "gifts": [],
  "giftLinks": [],
  "tags": [],
  "giftTags": [],
  "metadata": {
    "highestPersonId": 0,
    "highestGiftId": 0,
    "highestTagId": 0,
    "highestGiftLinkId": 0,
    "birthdayNotificationsEnabled": false
  }
}
```

Exported Person and Gift records include `sortOrder`. Person records include `photo`, `photoSource`, and `photoCrop` (or nulls), so photos and their crop move to a new phone with the backup, and `note`. Gift records include `price`. The backup format version stays 1: `note` and `price` are optional on import (missing `note` → "", missing `price` → null), so backups made before these fields still import.

File name: `giftlist-zaloha-YYYY-MM-DD.json` (local date). The copy sent through the system share sheet has the same content and the `.txt` extension (browsers do not share `.json` files); import validates the content, not the extension.

## Import rules

Import is a merge by stable ID. GiftTag associations are merged by their `giftId` + `tagId` pair (import only adds associations). The birthday-notification setting is imported.

For each imported entity:
- same ID exists locally → replace with imported values;
- ID does not exist → create using imported ID;
- local entities absent from import remain untouched;
- no entity is deleted as a consequence of import (except tags in a fresh installation, see above).

After merging links, renormalize each affected gift's link `sortOrder` to `0..n-1`: imported links first in their imported order, then remaining local links in their local order.

Validate the complete import document **and** the resulting merged dataset before any database write:
- schema version (unsupported → Czech error);
- required fields, field types, enum values;
- IDs are positive safe integers;
- birthday format (`YYYY-MM-DD` valid date, or `--MM-DD` valid month/day incl. `--02-29`);
- photo fields: all null, or all set — `photo` a base64 `data:image/jpeg|png|webp` URL of at most 300 000 characters, `photoSource` the same of at most 1 500 000 characters, `photoCrop` with `zoom` 1–4 and finite `dx`, `dy`;
- HTTP/HTTPS URLs;
- `note` a string when present; `price` null or a finite number 0–100 000 000 with at most two decimals when present;
- referential integrity;
- tag-name uniqueness.

If validation fails, write nothing.

Unknown fields in the file are dropped; missing photo fields of a person are treated as null. The merge is planned once for the confirmation ("preview", read-only) and computed again **inside the write transaction**, validated there, and only then written.

Counters after import: maximum of the local counter, the imported counter, and all IDs present in the resulting dataset.

Before writing into a non-fresh installation, the UI shows how many local people, gifts, and tags will be overwritten by records with the same ID, and asks for confirmation.

## Date handling

Store birthdays as `YYYY-MM-DD` or `--MM-DD`; never convert them through UTC timestamps.

Store `createdAt`, `updatedAt`, `shownAt`, `lastExportAt` as ISO-8601 timestamps.

Birthday calculations use the user's local calendar date.

Treat a 29 February birthday as 28 February in a non-leap year.

## Schema migrations

The current IndexedDB version is **6**.

The migration from version 1 to 2 (version 1 had no `sortOrder`, metadata preferences, or `notificationLog`):
- backfills `Person.sortOrder` by name (cs-CZ);
- backfills `Gift.sortOrder` per recipient by the PRIORITY order;
- adds the new metadata fields with defaults;
- creates `notificationLog`;
- keeps all existing data.

The migration from version 2 to 3 adds `photo: null` to every existing person and keeps all other data and preferences.

The migration from version 3 to 4 sets `photoSource` and `photoCrop`: an existing photo becomes its own source with the initial crop (`zoom 1`, centered); people without a photo get nulls.

The migration from version 4 to 5 adds `seenAt` to every NotificationLog entry, set to its `shownAt` (reminders shown before the upgrade count as seen, so the upgrade does not revive old reminders).

The migration from version 5 to 6 adds `note: ""` to every person and `price: null` to every gift; everything else is kept.
