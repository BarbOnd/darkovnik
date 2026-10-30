export type PluralForms = {
  /** 1 */
  one: string;
  /** 2–4 */
  few: string;
  /** 0, 5+, and fractions */
  other: string;
};

export const GIFT_FORMS: PluralForms = { one: "dárek", few: "dárky", other: "dárků" };
/** After "u" / "z" etc.: "u 1 dárku", "u 3 dárků" */
export const GIFT_GENITIVE_FORMS: PluralForms = { one: "dárku", few: "dárků", other: "dárků" };
export const DAY_FORMS: PluralForms = { one: "den", few: "dny", other: "dní" };
export const YEAR_FORMS: PluralForms = { one: "rok", few: "roky", other: "let" };

const pluralRules = new Intl.PluralRules("cs-CZ");

export function pluralForm(count: number, forms: PluralForms): string {
  const category = pluralRules.select(count);
  if (category === "one") return forms.one;
  if (category === "few") return forms.few;
  return forms.other;
}

/** "0 dárků", "1 dárek", "3 dárky", "5 dárků" */
export function formatCount(count: number, forms: PluralForms): string {
  return `${count} ${pluralForm(count, forms)}`;
}
