import { parseBirthday } from "../domain/birthday";

/** Nominative month names for pickers ("leden" …). */
export const MONTH_NAMES = [
  "leden",
  "únor",
  "březen",
  "duben",
  "květen",
  "červen",
  "červenec",
  "srpen",
  "září",
  "říjen",
  "listopad",
  "prosinec",
] as const;

/** Genitive month names for dates ("14. května"). */
const MONTH_NAMES_GENITIVE = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
] as const;

/** "14. května 1990", or "14. května" when the year is unknown. Empty string for invalid input. */
export function formatBirthdayCs(birthday: string): string {
  const parts = parseBirthday(birthday);
  if (parts === null) return "";
  const date = `${parts.day}. ${MONTH_NAMES_GENITIVE[parts.month - 1]}`;
  return parts.year === null ? date : `${date} ${parts.year}`;
}
