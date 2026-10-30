import { useCallback, useId, useState } from "react";
import { useApp } from "../../app/AppContext";
import { paths } from "../../app/routes";
import { Link } from "../../components/Link";
import { PersonAvatar } from "../../components/PersonAvatar";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusMessage } from "../../components/StatusMessage";
import { PlusIcon } from "../../components/icons";
import { isOneOf, PEOPLE_SORT_MODES } from "../../domain/entities";
import { countActiveGiftsByPerson } from "../../domain/gifts";
import { sortPeople } from "../../domain/sorting";
import { formatCount, GIFT_FORMS } from "../../lib/plural";
import { useLoad } from "../../lib/useLoad";

export function PeopleScreen() {
  const { repository, metadata, updatePreferences } = useApp();
  const sortSelectId = useId();
  const [sortError, setSortError] = useState(false);

  const load = useCallback(async () => {
    const [people, gifts] = await Promise.all([repository.listPeople(), repository.listGifts()]);
    return { people, activeGiftCounts: countActiveGiftsByPerson(gifts) };
  }, [repository]);
  const overview = useLoad(load);

  return (
    <>
      <ScreenHeader title="GiftList" />

      <section className="section" aria-labelledby="people-heading">
        <div className="section__header">
          <h2 id="people-heading">Lidé</h2>
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
        </div>
        {sortError && <StatusMessage kind="error" message="Řazení se nepodařilo uložit." />}

        {overview.status === "loading" && <StatusMessage kind="loading" />}
        {overview.status === "error" && (
          <StatusMessage kind="error" message="Seznam lidí se nepodařilo načíst." />
        )}
        {overview.status === "ready" &&
          (overview.data.people.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__title">Zatím tu nikdo není.</p>
              <p>Přidejte prvního člověka, pro kterého chcete sbírat nápady na dárky.</p>
              <Link className="button button--primary" href={paths.personNew()}>
                <PlusIcon />
                Přidat osobu
              </Link>
            </div>
          ) : (
            <>
              <ul className="person-list">
                {sortPeople(overview.data.people, metadata.peopleSortMode).map((person) => (
                  <li key={person.id}>
                    <Link className="person-row" href={paths.person(person.id)}>
                      <PersonAvatar seed={person.avatarSeed} name={person.name} photo={person.photo} />
                      <span className="person-row__text">
                        <span className="person-row__name">{person.name}</span>
                        <span className="person-row__meta">
                          {formatCount(overview.data.activeGiftCounts.get(person.id) ?? 0, GIFT_FORMS)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link className="button button--secondary button--block" href={paths.personNew()}>
                <PlusIcon />
                Přidat osobu
              </Link>
            </>
          ))}
      </section>
    </>
  );
}
