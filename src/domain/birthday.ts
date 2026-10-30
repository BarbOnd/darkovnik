export type BirthdayParts = {
  year: number | null;
  month: number;
  day: number;
};

const FULL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YEARLESS_DATE = /^--(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(month: number, year: number | null): number {
  if (month === 2) return year === null || isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isValidParts({ year, month, day }: BirthdayParts): boolean {
  if (year !== null && (!Number.isInteger(year) || year < 1 || year > 9999)) return false;
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  return Number.isInteger(day) && day >= 1 && day <= daysInMonth(month, year);
}

/** Parses "YYYY-MM-DD" or "--MM-DD" (year unknown). Returns null for invalid values. */
export function parseBirthday(value: string): BirthdayParts | null {
  const full = FULL_DATE.exec(value);
  const yearless = full === null ? YEARLESS_DATE.exec(value) : null;
  let parts: BirthdayParts;
  if (full !== null) {
    parts = { year: Number(full[1]), month: Number(full[2]), day: Number(full[3]) };
  } else if (yearless !== null) {
    parts = { year: null, month: Number(yearless[1]), day: Number(yearless[2]) };
  } else {
    return null;
  }
  return isValidParts(parts) ? parts : null;
}

export function isValidBirthday(value: string): boolean {
  return parseBirthday(value) !== null;
}

/** Formats birthday parts to the stored form. Throws for an invalid date. */
export function formatBirthday(parts: BirthdayParts): string {
  if (!isValidParts(parts)) throw new Error("Neplatné datum narozenin.");
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return parts.year === null
    ? `--${month}-${day}`
    : `${String(parts.year).padStart(4, "0")}-${month}-${day}`;
}
