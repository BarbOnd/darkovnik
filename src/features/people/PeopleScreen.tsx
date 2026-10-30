import { useCallback, useId, useState } from "react";
import { useApp } from "../../app/AppContext";
import { paths } from "../../app/routes";
import { Link } from "../../components/Link";
import { PersonAvatar } from "../../components/PersonAvatar";
import { QuickAddButton } from "../../components/QuickAddButton";
import { ReorderList } from "../../components/ReorderList";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusMessage } from "../../components/StatusMessage";
import { PlusIcon } from "../../components/icons";
import { isOneOf, PEOPLE_SORT_MODES, type Person } from "../../domain/entities";
import { countActiveGiftsByPerson } from "../../domain/gifts";
import { sortPeople } from "../../domain/sorting";
import { formatCount, GIFT_FORMS } from "../../lib/plural";
import { useLoad } from "../../lib/useLoad";
import { MissedRemindersCard } from "../notifications/MissedRemindersCard";
import { UpcomingBirthdays } from "./UpcomingBirthdays";

function PersonSummary({ person, activeGifts }: { person: Person; activeGifts: number }) {
  return (
    <>
      <PersonAvatar seed={person.avatarSeed} name={person.name} photo={person.photo} />
      <span className="person-row__text">
        <span className="person-row__name">{person.name}</span>
        <span className="person-row__meta">{formatCount(activeGifts, GIFT_FORMS)}</span>
      </span>
    </>
  );
}

export function PeopleScreen() {
  const { repository, metadata, updatePreferences } = useApp();
  const sortSelectId = useId();
  const [sortError, setSortError] = useState(false);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(async () => {
    const [people, gifts] = await Promise.all([repository.listPeople(), repository.listGifts()]);
    return { people, activeGiftCounts: countActiveGiftsByPerson(gifts) };
  }, [repository]);
  const overview = useLoad(load);
  const manual = metadata.peopleSortMode === "MANUAL";

  return (
    <>
      <ScreenHeader title="GiftList" />

      <MissedRemindersCard />
      {overview.status === "ready" && overview.data.people.length > 0 && !reordering && (
        <UpcomingBirthdays people={overview.data.people} />
      )}

      <section className="section" aria-labelledby="people-heading">
        <div className="section__header">
          <h2 id="people-heading">Lidé</h2>
          {!reordering && (
            <>
              <label className="visually-hidden" htmlFor={sortSelectId}>
                Řazení lidí
              </label>
              <select
                id={sortSelectId}
                className="compact-select"
                value={metadata.peopleSortMode}
                onChange={(event) => {
                  const mode = event.target.value;
                  if (!isOneOf(PEOPLE_SORT_MODES, mode)) return;
                  setSortError(false);
                  updatePreferences({ peopleSortMode: mode }).catch(() => setSortError(true));
                }}
              >
                <option value="ALPHABETICAL">Abecedně</option>
                <option value="MANUAL">Vlastní pořadí</option>
              </select>
            </>
          )}
        </div>
        {sortError && <StatusMessage kind="error" message="Řazení se nepodařilo uložit." />}

        {overview.status === "loading" && <StatusMessage kind="loading" />}
        {overview.status === "error" && (
          <StatusMessage kind="error" message="Seznam lidí se nepodařilo načíst." />
        )}
        {overview.status === "ready" && overview.data.people.length === 0 && (
          <div className="empty-state">
            <p className="empty-state__title">Zatím tu nikdo není.</p>
            <p>Přidejte prvního člověka, pro kterého chcete sbírat nápady na dárky.</p>
            <Link className="button button--primary" href={paths.personNew()}>
              <PlusIcon />
              Přidat osobu
            </Link>
          </div>
        )}
        {overview.status === "ready" && overview.data.people.length > 0 && reordering && (
          <>
            <p className="field__hint">Přetáhněte lidi za úchyt ⋮⋮, nebo použijte šipky. Pořadí se ukládá hned.</p>
            <ReorderList
              items={sortPeople(overview.data.people, "MANUAL")}
              getId={(person) => person.id}
              getLabel={(person) => person.name}
              renderItem={(person) => (
                <span className="reorder-row__label">
                  <PersonAvatar seed={person.avatarSeed} name={person.name} photo={person.photo} size={32} />
                  {person.name}
                </span>
              )}
              onReorder={(ids) => repository.reorderPeople(ids)}
            />
            <button
              type="button"
              className="button button--primary button--block"
              onClick={() => {
                setReordering(false);
                overview.reload();
              }}
            >
              Hotovo
            </button>
          </>
        )}
        {overview.status === "ready" && overview.data.people.length > 0 && !reordering && (
          <>
            <ul className="person-list">
              {sortPeople(overview.data.people, metadata.peopleSortMode).map((person) => (
                <li key={person.id}>
                  <Link className="person-row" href={paths.person(person.id)}>
                    <PersonSummary person={person} activeGifts={overview.data.activeGiftCounts.get(person.id) ?? 0} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="list-actions">
              <Link className="button button--secondary" href={paths.personNew()}>
                <PlusIcon />
                Přidat osobu
              </Link>
              {manual && overview.data.people.length > 1 && (
                <button type="button" className="button button--ghost" onClick={() => setReordering(true)}>
                  Upravit pořadí
                </button>
              )}
            </div>
          </>
        )}
      </section>
      {!reordering && <QuickAddButton />}
    </>
  );
}
