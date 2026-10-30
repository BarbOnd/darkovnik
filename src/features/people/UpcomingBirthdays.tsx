import { paths } from "../../app/routes";
import { Link } from "../../components/Link";
import { PersonAvatar } from "../../components/PersonAvatar";
import { localDateOf, upcomingBirthdays, UPCOMING_WINDOW_DAYS } from "../../domain/birthdays";
import type { Person } from "../../domain/entities";
import { formatDayMonth, formatRelativeDays } from "../../lib/format";
import { formatCount, YEAR_FORMS } from "../../lib/plural";

/** Birthdays from today to today + 30 days (PRODUCT.md §10). */
export function UpcomingBirthdays({ people }: { people: Person[] }) {
  const upcoming = upcomingBirthdays(people, localDateOf(new Date()));

  return (
    <section className="section" aria-labelledby="upcoming-heading">
      <h2 id="upcoming-heading" className="section__title">
        Nadcházející narozeniny
      </h2>
      {upcoming.length === 0 ? (
        <p className="muted">V příštích {UPCOMING_WINDOW_DAYS} dnech nikdo nemá narozeniny.</p>
      ) : (
        <ul className="birthday-list">
          {upcoming.map(({ person, occurrence, daysUntil, age }) => (
            <li key={person.id}>
              <Link className="birthday-row" href={paths.person(person.id)}>
                <PersonAvatar seed={person.avatarSeed} name={person.name} photo={person.photo} size={36} />
                <span className="birthday-row__text">
                  <span className="birthday-row__name">{person.name}</span>
                  <span className="birthday-row__meta">
                    {daysUntil <= 1 ? formatRelativeDays(daysUntil) : `${formatDayMonth(occurrence)} · ${formatRelativeDays(daysUntil)}`}
                    {age !== null && ` · ${formatCount(age, YEAR_FORMS)}`}
                  </span>
                </span>
                {daysUntil === 0 && (
                  <span className="birthday-row__today" aria-hidden="true">
                    🎂
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
