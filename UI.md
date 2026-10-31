# UI and Design

## Design direction

GiftList should feel minimalist, calm, warm, modern, lightweight, and personal.

Avoid visual clutter, excessive cards, heavy shadows, unnecessary gradients, excessive animation, and dashboard-like complexity.

## Typography

Clean modern sans-serif via the system font stack (speed and offline reliability). No remote fonts.

## Brand

Logo and palette come from the brand sheet "Dárkovník": a lavender rounded square with a white gift box and a heart bow (`public/icons/giftlist.svg`, maskable variant with a full-bleed background; PNG sizes rendered from the SVG, see DEVELOPMENT.md). Palette: `#8E7BE0` lavender, `#E2DBFA` light lavender, `#F8F6FF` background, `#5B4BB8` deep violet (primary actions in the light theme), `#2B2347` dark (text in light, background in dark). The icon appears next to the title on the People screen; the slogan "Všechny dárky pod jednou mašlí." is shown in Nastavení → O aplikaci.

## Themes

- Light and dark theme, implemented with CSS custom properties (design tokens) derived from the brand palette; the light theme uses `#F8F6FF` background and `#5B4BB8` accent, the dark theme `#2B2347` background and a lighter lavender accent for contrast.
- Default follows the system (`prefers-color-scheme`); Settings can force Světlý / Tmavý. A forced theme is applied before the first render (mirrored in `localStorage`), so the start does not flash the system theme.
- Set `<meta name="theme-color">` for both themes so the Android status bar matches.
- Check contrast and avatar legibility in both themes.

## Mobile first

Primary target: Android phone, portrait. Desktop is secondary but usable. Support 320 px width and above.

## Navigation

Bottom navigation with exactly two destinations:

```text
Lidé | Nastavení
```

No separate Gifts destination; gifts are accessed through a person's detail. The `+` quick-add button is prominent on the People screen and the person detail.

## People screen

```text
Dárkovník

Zmeškané připomínky                    [Zavřít]
────────────────
[ avatar ] Petr
           narozeniny před 2 dny

( Hledat dárek…                        )

Nadcházející narozeniny
────────────────
[ avatar ] Jana                          🎂
           dnes · 31 let · 2 dárky
[ avatar ] Petr
           14. května · za 12 dní · 0 dárků

Lidé                     [Abecedně ▾]
────────────────
[ avatar ] Jana
           4 dárky
[ avatar ] Matěj
           1 dárek

                                    ( + )
```

- The "Zmeškané připomínky" card appears only when there is something to show.
- The sort switch offers "Abecedně" / "Vlastní pořadí"; in "Vlastní pořadí" an "Upravit pořadí" action appears next to "Přidat osobu" below the list.
- "Nadcházející narozeniny" shows one quiet line when nobody has a birthday in the next 30 days.
- The floating `+` (bottom right, above the navigation) opens quick add.
- The search field (shown once there is at least one gift) searches all gifts by name and note; while it has text, "Výsledky hledání" replaces the birthdays and the people list (PRODUCT.md §10). Rows: recipient avatar, gift name, "Pro: Jana", status unless Nápad; tapping opens the gift.
- Do not overload the screen with statistics.

## Person detail

```text
← Jana                         [⋯]

[avatar nebo fotka]
🎂 14. května 1990 · za 12 dní · 36 let
Velikost M, má ráda modrou              (poznámka, jen když je vyplněná)

Dárky                [Podle priority ▾]

[Aktivní] [Koupeno] [Předáno] [Vše]
[Narozeniny] [Vánoce] [Výročí]
Zrušit filtry

Kniha                               ↗
★★★  450 Kč  Koupí: Petr  [Narozeniny]
vázané vydání, ne brožura

Sluchátka                          ✓
★★☆  1 990 Kč

Celkem 2 440 Kč                     (only when a visible gift has a price)
[Upravit pořadí]            (only in Vlastní pořadí)
                                    ( + )
```

- The `⋯` menu contains: Upravit, Smazat. Avatar and photo are changed only in the person form (Upravit).
- Status chips are single-select; tag chips are multi-select; selected chips are visually distinct.
- "Zrušit filtry" appears only when filters differ from the default (Aktivní, no tags).
- Given gifts are hidden unless "Předáno" or "Vše" is selected.
- Tapping a gift opens its edit form. New gifts are added only through quick add: the floating "+" (and "Přidat dárek" in the empty state) opens it with this person preselected.
- A gift with links shows an "open" icon (↗) at the right edge of the row that opens its first link externally, without entering the edit form (accessible name "Otevřít odkaz: alza.cz", plus the link count when there are more). The first line of the note is shown under the meta line, truncated to one line.

## Reorder mode

- Entered via "Upravit pořadí" (only in "Vlastní pořadí").
- Each row shows a drag handle ⋮⋮ on the right and "Posunout nahoru/dolů" buttons for accessibility.
- Dragging works only by the handle (touch: press and move), so normal scrolling stays reliable.
- A "Hotovo" button exits the mode.
- In reorder mode a row shows only what identifies it (gift name; person avatar + name) so the controls fit at 320 px.
- When only a filtered subset is reordered (filter "Aktivní"), hidden gifts keep their positions in the manual order.
- Given gifts are always listed last and are not part of reorder mode; they keep their positions in the manual order.
- Use `@dnd-kit` (free, open source) or an equally small solution.

## Person editing

Fields: Fotka/Avatar, Jméno, Narozeniny (den, měsíc, rok — rok volitelný), Poznámka (nepovinné; hint "Třeba velikosti, oblíbené barvy nebo co už má."). The note is shown in the person detail under the birthday, line breaks kept.

### Birthday input
Three compact fields or selects: Den, Měsíc (Czech month names), Rok (optional). Leaving the year empty means "year unknown". Validate the day against the month (incl. 29 Feb when the year is empty or a leap year).

### Avatar
DiceBear `initial-face`, deterministic from `avatarSeed`; the letter is the initial of the current name (PRODUCT.md §16). "Změnit avatara" (in the person form, only without a photo) opens a dialog with a grid of 9 variants from new random seeds, plus "Další varianty". Selecting one updates the preview; it is saved with "Uložit".

### Photo
Picking a file, or "Změnit fotku" on an existing photo (opens with the saved crop), opens the "Upravit výřez fotky" dialog: the image in a square area with a circular frame (outside dimmed), drag to move, pinch / wheel / "Přiblížení" slider to zoom, keyboard arrows and +/−; "Vybrat jinou fotku"; buttons "Zrušit" and "Použít". Next to the avatar preview: "Nahrát fotku" (or "Změnit fotku") and, when a photo exists, "Odebrat fotku" instead of "Změnit avatara". Short hint: the photo stays only on this device and in the backup. Show "Načítám…" while the image is decoded and a Czech error for unsupported files.

## Gift form

Order:
1. Příjemce (single select, can be changed; the gift form is used for editing — new gifts come from quick add);
2. Název dárku.

Then: Kdo koupí, Priorita, Cena (Kč), Štítky, Odkazy, Poznámka, Stav. "Cena (Kč)" is a short numeric field (placeholder "nepovinné"); an unreadable value is reported under the form and the field is marked invalid.

Do not make the form feel administrative: optional fields are collapsed under "Další podrobnosti" (open when editing). Links: URL + optional title, buttons Otevřít / Posunout nahoru / Posunout dolů / Odebrat. Status labels: Nápad / Koupeno / Předáno. "Smazat dárek" is at the bottom of the edit form, separated from Uložit, and asks for confirmation.

## Quick add

```text
+
→ příjemce (chips, multi-select, "+ Nová osoba")
→ název dárku
→ (Další podrobnosti — collapsed, optional)
→ [Uložit]  [Uložit a přidat další]
```

- "+ Nová osoba" shows an inline name field; confirming creates and selects the person.
- With no people yet, the inline name field is shown immediately.
- Under the name, a quiet hint appears when a selected recipient already has a gift with the same name (PRODUCT.md §11); it does not block saving.
- Opened from the Android share sheet, a short line "Nápad ze sdílené stránky…" is shown under the title, the name is prefilled from the shared title and "Další podrobnosti" is open with the shared address in "Odkazy".
- After "Uložit", close the flow and show a short toast "Uloženo" ("Uloženo – N dárky" for several recipients) above the bottom navigation.
- After "Uložit a přidat další", clear the name and reset the details to defaults, keep recipients, focus the name field.

## Status indicators

- NEW: no indicator.
- BOUGHT: subtle check icon, accessible name "Koupeno".
- GIVEN: gift icon, accessible name "Předáno"; the meta line adds "Předáno 2025".

## Tags

Compact readable chips. Tag management lives in Settings → Štítky: a "Nový štítek" field with "Přidat", and a list showing each tag with its gift count and icon buttons Přejmenovat (inline edit) / Smazat (confirmation says from how many gifts it will be removed; gifts stay). In the gift form, tags are a multi-select chip group between Priorita and Odkazy.

## Settings screen

```text
Nastavení

Upozornění na narozeniny        [ přepínač ]
  30 dní předem a v den narozenin.
  (když je zapnuto: stav systémových oznámení,
   a zda běží kontrola na pozadí — PRODUCT.md §12)

Vzhled         Podle systému / Světlý / Tmavý

Štítky                                    >

Data
  [Exportovat data]
  [Sdílet zálohu]        (only where the browser can share files)
  [Importovat data]
  Poslední záloha: před 12 dny
  (případná nenápadná připomínka k zálohování)
  (stav trvalého úložiště)
  (chyba importu / souhrn importu)

O aplikaci (verze)
```

Export shows the toast "Záloha stažena". Import of an invalid file shows the Czech error under the buttons; into an installation with data it first opens the "Importovat zálohu?" confirmation (PRODUCT.md §14).

## Czech plurals

Use the helper in `src/lib/plural.ts` (`Intl.PluralRules("cs-CZ")`) for all counts:
- dárek / dárky / dárků; genitive after "u"/"z": dárku / dárků;
- osoba / osoby / osob; štítek / štítky / štítků; odkaz / odkazy / odkazů;
- den / dny / dní ("za 2 dny", "za 12 dní"; 1 day reads "zítra", past days "před 3 dny");
- rok / roky / let (age).

Texts mentioning people stay gender-neutral (e.g. "Jana: narozeniny dnes"), because names do not reliably tell grammatical gender.

## Buttons and destructive actions

Primary actions are visually clear. Destructive actions are separated and require confirmation. Person deletion warns if the person is a buyer on other gifts. Import into an installation with data shows the overwrite confirmation.

## Accessibility

Comfortable touch targets (≥ 44 px), visible focus states, semantic HTML, labels for form controls, accessible names for icon-only buttons, sufficient contrast in both themes.

## Offline UX

Do not show unnecessary offline warnings. Local-first is intentional.

## App updates

When a new version of the app is available (service worker update), show a small non-blocking banner at the top "Je dostupná nová verze" with "Načíst znovu" and a close button. Nothing reloads by itself.

## Toasts

Short confirmations ("Uloženo", "Záloha stažena") appear for ~2.5 s above the bottom navigation, survive navigation, and are announced to screen readers (`role="status"`).
