import { useCallback, useId, useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import { paths } from "../../app/routes";
import { Link } from "../../components/Link";
import { ReorderList } from "../../components/ReorderList";
import { StatusMessage } from "../../components/StatusMessage";
import { CheckIcon, GiftIcon, PlusIcon } from "../../components/icons";
import { GIFT_SORT_MODES, isOneOf, type Gift, type Person, type Tag } from "../../domain/entities";
import {
  canReorderWithFilter,
  DEFAULT_GIFT_FILTER,
  filterGifts,
  isDefaultFilter,
  STATUS_FILTERS,
  type GiftFilter,
  type StatusFilter,
} from "../../domain/giftFilters";
import { compareTagsByName, givenLast, reorderSubset, sortGifts } from "../../domain/sorting";
import { useLoad } from "../../lib/useLoad";
import { PriorityStars } from "./PriorityStars";

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  ACTIVE: "Aktivní",
  BOUGHT: "Koupeno",
  GIVEN: "Předáno",
  ALL: "Vše",
};

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

const GIFTS_HEADING_ID = "gifts-heading";

/** "Dárky" heading; `inRow` when it shares a row with the sort switch. */
function GiftsHeading({ inRow = false }: { inRow?: boolean }) {
  return (
    <h2 id={GIFTS_HEADING_ID} className={inRow ? undefined : "section__title"}>
      Dárky
    </h2>
  );
}

function AddGiftButton({ personId }: { personId: number }) {
  return (
    <Link className="button button--primary" href={paths.quickAdd(personId)}>
      <PlusIcon />
      Přidat dárek
    </Link>
  );
}

type GiftData = {
  gifts: Gift[];
  peopleById: Map<number, Person>;
  tags: Tag[];
  tagIdsByGift: Map<number, Set<number>>;
};

function GiftSummary({ gift, data }: { gift: Gift; data: GiftData }) {
  const buyer = gift.buyerPersonId === null ? undefined : data.peopleById.get(gift.buyerPersonId);
  const tagIds = data.tagIdsByGift.get(gift.id);
  const tagNames = data.tags.filter((tag) => tagIds?.has(tag.id)).map((tag) => tag.name);
  return (
    <>
      <span className="gift-row__text">
        <span className="gift-row__name">{gift.name}</span>
        <span className="gift-row__meta">
          <PriorityStars priority={gift.priority} />
          {buyer !== undefined && <span>Koupí: {buyer.name}</span>}
          {tagNames.map((name) => (
            <span key={name} className="tag-label">
              {name}
            </span>
          ))}
        </span>
      </span>
      <StatusIndicator status={gift.status} />
    </>
  );
}

function GiftFilters({ filter, tags, onChange }: { filter: GiftFilter; tags: Tag[]; onChange(filter: GiftFilter): void }) {
  const id = useId();
  return (
    <div className="gift-filters">
      <fieldset className="gift-filters__group">
        <legend className="visually-hidden">Stav dárků</legend>
        <div className="chip-group">
          {STATUS_FILTERS.map((status) => (
            <label key={status} className="chip">
              <input
                type="radio"
                name={`${id}-status`}
                checked={filter.status === status}
                onChange={() => onChange({ ...filter, status })}
              />
              <span className="chip__body chip__body--text">{STATUS_FILTER_LABELS[status]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {tags.length > 0 && (
        <fieldset className="gift-filters__group">
          <legend className="visually-hidden">Štítky (dárek musí mít všechny vybrané)</legend>
          <div className="chip-group">
            {tags.map((tag) => (
              <label key={tag.id} className="chip">
                <input
                  type="checkbox"
                  checked={filter.tagIds.includes(tag.id)}
                  onChange={() =>
                    onChange({
                      ...filter,
                      tagIds: filter.tagIds.includes(tag.id)
                        ? filter.tagIds.filter((other) => other !== tag.id)
                        : [...filter.tagIds, tag.id],
                    })
                  }
                />
                <span className="chip__body chip__body--text">{tag.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

function GiftRows({ personId, data, onReordered }: { personId: number; data: GiftData; onReordered(): void }) {
  const { repository, metadata, updatePreferences } = useApp();
  const sortId = useId();
  // Filters live only in this component, so they reset whenever the person is left.
  const [filter, setFilter] = useState<GiftFilter>(DEFAULT_GIFT_FILTER);
  const [reordering, setReordering] = useState(false);
  const [sortError, setSortError] = useState(false);
  /** Full manual order of all the person's gifts, kept current while reordering a filtered subset. */
  const manualOrder = useRef<number[]>([]);

  if (data.gifts.length === 0) {
    return (
      <>
        <GiftsHeading />
        <div className="empty-state">
          <p className="empty-state__title">Zatím tu nejsou žádné nápady.</p>
          <p>Přidejte první nápad na dárek.</p>
          <AddGiftButton personId={personId} />
        </div>
      </>
    );
  }

  const manual = metadata.giftSortMode === "MANUAL";
  // Given gifts are always listed last; within each group the selected sort mode applies.
  const visible = givenLast(filterGifts(sortGifts(data.gifts, metadata.giftSortMode), data.tagIdsByGift, filter));
  // Given gifts stay at the end, so only the others are reordered (given ones keep their manual slots).
  const reorderable = visible.filter((gift) => gift.status !== "GIVEN");
  const reorderAllowed = canReorderWithFilter(filter);

  function startReordering() {
    manualOrder.current = sortGifts(data.gifts, "MANUAL").map((gift) => gift.id);
    setReordering(true);
  }

  async function saveOrder(visibleIds: number[]) {
    const next = reorderSubset(manualOrder.current, visibleIds);
    await repository.reorderGifts(personId, next);
    manualOrder.current = next;
  }

  if (reordering) {
    return (
      <>
        <GiftsHeading />
        <p className="field__hint">Přetáhněte dárky za úchyt ⋮⋮, nebo použijte šipky. Pořadí se ukládá hned.</p>
        <ReorderList
          items={reorderable}
          getId={(gift) => gift.id}
          getLabel={(gift) => gift.name}
          renderItem={(gift) => <span className="reorder-row__label">{gift.name}</span>}
          onReorder={saveOrder}
        />
        <button
          type="button"
          className="button button--primary button--block"
          onClick={() => {
            setReordering(false);
            onReordered();
          }}
        >
          Hotovo
        </button>
      </>
    );
  }

  return (
    <>
      <div className="section__header">
        <GiftsHeading inRow />
        <label className="visually-hidden" htmlFor={sortId}>
          Řazení dárků
        </label>
        <select
          id={sortId}
          className="compact-select"
          value={metadata.giftSortMode}
          onChange={(event) => {
            const mode = event.target.value;
            if (!isOneOf(GIFT_SORT_MODES, mode)) return;
            setSortError(false);
            updatePreferences({ giftSortMode: mode }).catch(() => setSortError(true));
          }}
        >
          <option value="PRIORITY">Podle priority</option>
          <option value="MANUAL">Vlastní pořadí</option>
        </select>
      </div>
      {sortError && <StatusMessage kind="error" message="Řazení se nepodařilo uložit." />}

      <GiftFilters filter={filter} tags={data.tags} onChange={setFilter} />
      {!isDefaultFilter(filter) && (
        <button type="button" className="text-button" onClick={() => setFilter(DEFAULT_GIFT_FILTER)}>
          Zrušit filtry
        </button>
      )}

      {visible.length === 0 ? (
        <div className="empty-state empty-state--compact">
          <p>Žádný dárek neodpovídá vybraným filtrům.</p>
          <button type="button" className="button button--secondary" onClick={() => setFilter(DEFAULT_GIFT_FILTER)}>
            Zrušit filtry
          </button>
        </div>
      ) : (
        <ul className="gift-list">
          {visible.map((gift) => (
            <li key={gift.id}>
              <Link
                className={gift.status === "GIVEN" ? "gift-row gift-row--given" : "gift-row"}
                href={paths.giftEdit(gift.id)}
              >
                <GiftSummary gift={gift} data={data} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {manual && reorderAllowed && reorderable.length > 1 && (
        <div className="list-actions">
          <button type="button" className="button button--ghost" onClick={startReordering}>
            Upravit pořadí
          </button>
        </div>
      )}
      {manual && !reorderAllowed && (
        <p className="field__hint">Pořadí můžete upravit s filtrem Vše, nebo Aktivní bez štítků.</p>
      )}
    </>
  );
}

/** Gifts of one recipient with status and tag filters, sorting and manual reordering. */
export function GiftList({ person }: { person: Person }) {
  const { repository } = useApp();
  const load = useCallback(async (): Promise<GiftData> => {
    const [gifts, people, tags, giftTags] = await Promise.all([
      repository.listGiftsByPerson(person.id),
      repository.listPeople(),
      repository.listTags(),
      repository.listAllGiftTags(),
    ]);
    const tagIdsByGift = new Map<number, Set<number>>();
    giftTags.forEach(({ giftId, tagId }) => {
      const set = tagIdsByGift.get(giftId) ?? new Set<number>();
      set.add(tagId);
      tagIdsByGift.set(giftId, set);
    });
    return {
      gifts,
      peopleById: new Map(people.map((other) => [other.id, other])),
      tags: [...tags].sort(compareTagsByName),
      tagIdsByGift,
    };
  }, [repository, person.id]);
  const result = useLoad(load);

  return (
    <section className="section" aria-labelledby={GIFTS_HEADING_ID}>
      {result.status !== "ready" && <GiftsHeading />}
      {result.status === "loading" && <StatusMessage kind="loading" />}
      {result.status === "error" && <StatusMessage kind="error" message="Dárky se nepodařilo načíst." />}
      {result.status === "ready" && (
        <GiftRows personId={person.id} data={result.data} onReordered={result.reload} />
      )}
    </section>
  );
}
