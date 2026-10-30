import { useApp } from "../../app/AppContext";
import { paths } from "../../app/routes";
import { Link } from "../../components/Link";
import { PersonAvatar } from "../../components/PersonAvatar";
import { formatRelativeDays } from "../../lib/format";
import { formatCount, YEAR_FORMS } from "../../lib/plural";

/** Reminders found while the app was opened (PRODUCT.md §12); shown only when there are any. */
export function MissedRemindersCard() {
  const { missedReminders, dismissMissedReminders } = useApp();
  if (missedReminders.length === 0) return null;

  return (
    <section className="card" aria-labelledby="missed-heading">
      <div className="card__header">
        <h2 id="missed-heading">Zmeškané připomínky</h2>
        <button type="button" className="text-button" onClick={dismissMissedReminders}>
          Zavřít
        </button>
      </div>
      <ul className="birthday-list">
        {missedReminders.map((reminder) => (
          <li key={reminder.key}>
            <Link className="birthday-row" href={paths.person(reminder.person.id)}>
              <PersonAvatar
                seed={reminder.person.avatarSeed}
                name={reminder.person.name}
                photo={reminder.person.photo}
                size={36}
              />
              <span className="birthday-row__text">
                <span className="birthday-row__name">{reminder.person.name}</span>
                <span className="birthday-row__meta">
                  narozeniny {formatRelativeDays(reminder.daysUntil)}
                  {reminder.age !== null && ` · ${formatCount(reminder.age, YEAR_FORMS)}`}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
