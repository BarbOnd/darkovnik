import { formatBirthday, parseBirthday } from "../../domain/birthday";

/** Raw values of the Den / Měsíc / Rok inputs; empty string = not filled. */
export type BirthdayFields = {
  day: string;
  month: string;
  year: string;
};

export type BirthdayFieldsResult = { ok: true; value: string | null } | { ok: false; error: string };

export const MIN_BIRTH_YEAR = 1900;

export function birthdayToFields(birthday: string | null): BirthdayFields {
  const parts = birthday === null ? null : parseBirthday(birthday);
  if (parts === null) return { day: "", month: "", year: "" };
  return {
    day: String(parts.day),
    month: String(parts.month),
    year: parts.year === null ? "" : String(parts.year),
  };
}

/** Validates the inputs and returns the stored form ("YYYY-MM-DD", "--MM-DD", or null). */
export function fieldsToBirthday(fields: BirthdayFields, currentYear: number): BirthdayFieldsResult {
  const day = fields.day.trim();
  const month = fields.month.trim();
  const year = fields.year.trim();
  if (day === "" && month === "" && year === "") return { ok: true, value: null };
  if (day === "" || month === "") {
    return { ok: false, error: "Vyplňte den i měsíc narozenin, nebo nechte narozeniny prázdné." };
  }
  if (year !== "" && !/^\d{4}$/.test(year)) {
    return { ok: false, error: "Rok zadejte čtyřmi číslicemi, nebo ho nechte prázdný." };
  }
  const yearNumber = year === "" ? null : Number(year);
  if (yearNumber !== null && (yearNumber < MIN_BIRTH_YEAR || yearNumber > currentYear)) {
    return { ok: false, error: `Rok musí být mezi ${MIN_BIRTH_YEAR} a ${currentYear}.` };
  }
  try {
    return {
      ok: true,
      value: formatBirthday({ year: yearNumber, month: Number(month), day: Number(day) }),
    };
  } catch {
    return { ok: false, error: "Takové datum neexistuje. Zkontrolujte den a měsíc." };
  }
}
