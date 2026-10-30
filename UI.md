# UI and Design

## Design direction

GiftList should feel minimalist, calm, warm, modern, lightweight, and personal.

Avoid visual clutter, excessive cards, heavy shadows, unnecessary gradients, excessive animation, and dashboard-like complexity.

## Typography

Clean modern sans-serif via the system font stack (speed and offline reliability). No remote fonts.

## Themes

- Light and dark theme, implemented with CSS custom properties (design tokens).
- Default follows the system (`prefers-color-scheme`); Settings can force Světlý / Tmavý.
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
GiftList

Zmeškané připomínky                    [Zavřít]
────────────────
[ avatar ] Petr — narozeniny před 2 dny

Nadcházející narozeniny
────────────────
[ avatar ] Jana — dnes, 31 let
[ avatar ] Petr — 14. května · za 12 dní

Lidé                     [Abecedně ▾]
────────────────
[ avatar ] Jana
           4 dárky
[ avatar ] Matěj
           1 dárek

                                    ( + )
```

- The "Zmeškané připomínky" card appears only when there is something to show.
- The sort switch offers "Abecedně" / "Vlastní pořadí"; in "Vlastní pořadí" an "Upravit pořadí" action appears.
- Do not overload the screen with statistics.

## Person detail

```text
← Jana                         [⋯]

[avatar]
🎂 14. května · za 12 dní

Dárky                [Podle priority ▾]

[Aktivní] [Koupeno] [Předáno] [Vše]
[Vánoce] [Narozeniny] [Výročí]     Zrušit filtry

Kniha                           ★★★
   Narozeniny

Sluchátka                     ✓
   ★★

                                    ( + )
```

- The `⋯` menu contains: Upravit, Změnit avatara, Smazat.
- Status chips are single-select; tag chips are multi-select; selected chips are visually distinct.
- "Zrušit filtry" appears only when filters differ from the default (Aktivní, no tags).
- Given gifts are hidden unless "Předáno" or "Vše" is selected.

## Reorder mode

- Entered via "Upravit pořadí" (only in "Vlastní pořadí").
- Each row shows a drag handle ⋮⋮ on the right and "Posunout nahoru/dolů" buttons for accessibility.
- Dragging works only by the handle (touch: press and move), so normal scrolling stays reliable.
- A "Hotovo" button exits the mode.
- Use `@dnd-kit` (free, open source) or an equally small solution.

## Person editing

Fields: Jméno, Narozeniny (den, měsíc, rok — rok volitelný), Avatar.

### Birthday input
Three compact fields or selects: Den, Měsíc (Czech month names), Rok (optional). Leaving the year empty means "year unknown". Validate the day against the month (incl. 29 Feb when the year is empty or a leap year).

### Avatar
DiceBear `initial-face`, deterministic from `avatarSeed`. "Změnit avatara" opens a small grid (e.g. 6–9 variants) from new random seeds, plus "Další varianty". Selecting one saves its seed.

## Gift form

Order:
1. Příjemce (in edit mode: single select, can be changed; in add mode: multi-select);
2. Název dárku.

Then: Kdo koupí, Priorita, Štítky, Odkazy, Poznámka, Stav.

Do not make the form feel administrative; optional fields may be collapsed under "Další podrobnosti".

## Quick add

```text
+
→ příjemce (chips, multi-select, "+ Nová osoba")
→ název dárku
→ [Uložit]  [Uložit a přidat další]
```

- "+ Nová osoba" shows an inline name field; confirming creates and selects the person.
- With no people yet, the inline name field is shown immediately.
- After "Uložit", close the flow and show a short confirmation (e.g. toast "Uloženo").
- After "Uložit a přidat další", clear the name, keep recipients, focus the name field.

## Status indicators

- NEW: no indicator.
- BOUGHT: subtle check icon, accessible name "Koupeno".
- GIVEN: gift icon, accessible name "Předáno".

## Tags

Compact readable chips. Tag management lives in Settings (create, rename, delete with confirmation).

## Settings screen

```text
Nastavení

Upozornění na narozeniny        [ přepínač ]
  (případná poznámka o zablokovaných oznámeních)

Vzhled         Podle systému / Světlý / Tmavý

Štítky                                    >

Data
  Exportovat data
  Importovat data
  Poslední záloha: před 12 dny
  (případná nenápadná připomínka k zálohování)
  (stav trvalého úložiště)

O aplikaci (verze)
```

## Czech plurals

Use `Intl.PluralRules("cs-CZ")` or an equivalent helper for all counts:
- dárek / dárky / dárků;
- den / dny / dní ("za 1 den", "za 3 dny", "za 12 dní");
- rok / roky / let (age).

## Buttons and destructive actions

Primary actions are visually clear. Destructive actions are separated and require confirmation. Person deletion warns if the person is a buyer on other gifts. Import into an installation with data shows the overwrite confirmation.

## Accessibility

Comfortable touch targets (≥ 44 px), visible focus states, semantic HTML, labels for form controls, accessible names for icon-only buttons, sufficient contrast in both themes.

## Offline UX

Do not show unnecessary offline warnings. Local-first is intentional.

## App updates

When a new version of the app is available (service worker update), show a small non-blocking banner "Je dostupná nová verze" with "Načíst znovu".
