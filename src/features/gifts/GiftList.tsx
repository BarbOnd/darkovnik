import { useCallback, useState } from "react";
import { useApp } from "../../app/AppContext";
import { paths } from "../../app/routes";
import { Link } from "../../components/Link";
import { StatusMessage } from "../../components/StatusMessage";
import { CheckIcon, GiftIcon, PlusIcon } from "../../components/icons";
import type { Gift, Person } from "../../domain/entities";
import { isActiveGift } from "../../domain/gifts";
import { sortGifts } from "../../domain/sorting";
import { useLoad } from "../../lib/useLoad";
import { PriorityStars } from "./PriorityStars";

function StatusIndicator({ status }: { status: Gift["status"] }) {
  if (status === "BOUGHT") {
    return (
      <span className="gift-row__status" role="img" aria-label="Koupeno" title="Koupeno">
        <CheckIcon />
      </span>
    );
  }
  if (status === "GIVEN") {
    return (
      <span className="gift-row__status gift-row__status--given" role="img" aria-label="Předáno" title="Předáno">
        <GiftIcon />
      </span>
    );
  }
  return null;
}

function AddGiftButton({ personId }: { personId: number }) {
  return (
    <Link className="button button--primary" href={paths.giftNew(personId)}>
      <PlusIcon />
      Přidat dárek
    </Link>
  );
}

function GiftRows({ personId, gifts, peopleById }: {
  personId: number;
  gifts: Gift[];
  peopleById: Map<number, Person>;
}) {
  const { metadata } = useApp();
  const [showGiven, setShowGiven] = useState(false);

  if (gifts.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state__title">Zatím tu nejsou žádné nápady.</p>
        <p>Přidejte první nápad na dárek.</p>
        <AddGiftButton personId={personId} />
      </div>
    );
  }

  const sorted = sortGifts(gifts, metadata.giftSortMode);
  const givenCount = sorted.filter((gift) => gift.status === "GIVEN").length;
  const visible = showGiven ? sorted : sorted.filter(isActiveGift);

  return (
    <>
      {visible.length === 0 ? (
        <p className="status-message">Všechny dárky už jsou předané.</p>
      ) : (
        <ul className="gift-list">
          {visible.map((gift) => {
            const buyer = gift.buyerPersonId === null ? undefined : peopleById.get(gift.buyerPersonId);
            return (
              <li key={gift.id}>
                <Link
                  className={gift.status === "GIVEN" ? "gift-row gift-row--given" : "gift-row"}
                  href={paths.giftEdit(gift.id)}
                >
                  <span className="gift-row__text">
                    <span className="gift-row__name">{gift.name}</span>
                    <span className="gift-row__meta">
                      <PriorityStars priority={gift.priority} />
                      {buyer !== undefined && <span>Koupí: {buyer.name}</span>}
                    </span>
                  </span>
                  <StatusIndicator status={gift.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="gift-list__actions">
        <AddGiftButton personId={personId} />
        {givenCount > 0 && (
          <button
            type="button"
            className="button button--ghost"
            aria-pressed={showGiven}
            onClick={() => setShowGiven((current) => !current)}
          >
            {showGiven ? "Skrýt předané" : `Zobrazit předané (${givenCount})`}
          </button>
        )}
      </div>
    </>
  );
}

/** Gifts of one recipient; given gifts are hidden until the user shows them. */
export function GiftList({ person }: { person: Person }) {
  const { repository } = useApp();
  const load = useCallback(async () => {
    const [gifts, people] = await Promise.all([
      repository.listGiftsByPerson(person.id),
      repository.listPeople(),
    ]);
    return { gifts, peopleById: new Map(people.map((other) => [other.id, other])) };
  }, [repository, person.id]);
  const result = useLoad(load);

  return (
    <section className="section" aria-labelledby="gifts-heading">
      <h2 id="gifts-heading" className="section__title">
        Dárky
      </h2>
      {result.status === "loading" && <StatusMessage kind="loading" />}
      {result.status === "error" && <StatusMessage kind="error" message="Dárky se nepodařilo načíst." />}
      {result.status === "ready" && (
        <GiftRows personId={person.id} gifts={result.data.gifts} peopleById={result.data.peopleById} />
      )}
    </section>
  );
}
