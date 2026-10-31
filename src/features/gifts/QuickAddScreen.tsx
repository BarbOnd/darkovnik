import { useCallback, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useApp } from "../../app/AppContext";
import { goBack, paths, type SharedContent } from "../../app/routes";
import { PersonAvatar } from "../../components/PersonAvatar";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusMessage } from "../../components/StatusMessage";
import { PlusIcon } from "../../components/icons";
import type { Gift, Person, Tag } from "../../domain/entities";
import { findSimilarGift } from "../../domain/gifts";
import { comparePeopleByName, compareTagsByName } from "../../domain/sorting";
import { createAvatarSeed } from "../../lib/avatar";
import { formatCount, GIFT_FORMS } from "../../lib/plural";
import { requestPersistentStorage } from "../../lib/storage";
import { useLoad } from "../../lib/useLoad";
import { GiftDetailsFields } from "./GiftDetailsFields";
import { DEFAULT_GIFT_DETAILS, prepareGiftDetails, type GiftDetails } from "./giftDetails";
import { newLinkRow } from "./linkRows";

const NAME_MAX_LENGTH = 200;
const PERSON_NAME_MAX_LENGTH = 100;

type QuickAddError = {
  field: "recipients" | "name" | "person" | "links" | "price" | "save";
  message: string;
  linkRowKey?: string;
};

/** Details prefilled from content shared by another app: the link goes into "Odkazy". */
function detailsFromShared(shared: SharedContent | null): GiftDetails {
  if (shared === null || shared.url === null) return DEFAULT_GIFT_DETAILS;
  return { ...DEFAULT_GIFT_DETAILS, links: [{ ...newLinkRow(), url: shared.url }] };
}

function QuickAddForm({ initialPeople, initialGifts, tags, preselectedId, shared, closeTo }: {
  initialPeople: Person[];
  /** All gifts, for the duplicate hint. */
  initialGifts: Gift[];
  /** Tags sorted by name. */
  tags: Tag[];
  preselectedId: number | null;
  /** Link and/or name shared from another app (PRODUCT.md §11). */
  shared: SharedContent | null;
  /** Where "Uložit" / "Zrušit" return when there is no previous in-app screen. */
  closeTo: string;
}) {
  const { repository, showToast } = useApp();
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const newPersonRef = useRef<HTMLInputElement>(null);
  const [people, setPeople] = useState(() => [...initialPeople].sort(comparePeopleByName));
  const [gifts, setGifts] = useState(initialGifts);
  const [recipientIds, setRecipientIds] = useState<number[]>(() =>
    preselectedId !== null && initialPeople.some((person) => person.id === preselectedId) ? [preselectedId] : [],
  );
  const [name, setName] = useState(() => shared?.title?.slice(0, NAME_MAX_LENGTH) ?? "");
  // With nobody to choose from, the flow starts directly with the new-person field.
  const [addingPerson, setAddingPerson] = useState(initialPeople.length === 0);
  const [newPersonName, setNewPersonName] = useState("");
  const [error, setError] = useState<QuickAddError | null>(null);
  const [saving, setSaving] = useState(false);
  // Optional details stay collapsed so the quick flow stays quick; a shared link opens them so it is visible.
  const [details, setDetails] = useState<GiftDetails>(() => detailsFromShared(shared));
  const [detailsOpen, setDetailsOpen] = useState(shared?.url != null);
  const similar = findSimilarGift(gifts, recipientIds, name);
  const similarOwner = similar === undefined ? undefined : people.find((person) => person.id === similar.personId);

  function toggleRecipient(personId: number) {
    setRecipientIds((current) =>
      current.includes(personId) ? current.filter((other) => other !== personId) : [...current, personId],
    );
  }

  /** Creates the person typed in the inline field and selects them. Returns their ID. */
  async function createInlinePerson(): Promise<number | null> {
    const personName = newPersonName.trim();
    if (personName === "") {
      setError({ field: "person", message: "Vyplňte jméno nové osoby." });
      newPersonRef.current?.focus();
      return null;
    }
    const person = await repository.createPerson({ name: personName, birthday: null, avatarSeed: createAvatarSeed() });
    void requestPersistentStorage();
    setPeople((current) => [...current, person].sort(comparePeopleByName));
    setRecipientIds((current) => [...current, person.id]);
    setNewPersonName("");
    setAddingPerson(false);
    return person.id;
  }

  async function handleAddPerson() {
    setError(null);
    try {
      if ((await createInlinePerson()) !== null) nameRef.current?.focus();
    } catch {
      setError({ field: "person", message: "Osobu se nepodařilo přidat. Zkuste to prosím znovu." });
    }
  }

  function handleNewPersonKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter adds the person instead of submitting the whole form.
    if (event.key === "Enter") {
      event.preventDefault();
      void handleAddPerson();
    }
  }

  async function save(addAnother: boolean) {
    setError(null);
    const giftName = name.trim();
    let recipients = recipientIds;
    setSaving(true);
    try {
      // A typed but not yet confirmed new person is created on save.
      if (addingPerson && newPersonName.trim() !== "") {
        const personId = await createInlinePerson();
        if (personId === null) return;
        recipients = [...recipients, personId];
      }
      if (recipients.length === 0) {
        setError({ field: "recipients", message: "Vyberte, pro koho dárek je." });
        return;
      }
      if (giftName === "") {
        setError({ field: "name", message: "Vyplňte název dárku." });
        nameRef.current?.focus();
        return;
      }
      const prepared = prepareGiftDetails(details);
      if (!prepared.ok) {
        setDetailsOpen(true);
        setError(
          prepared.field === "links"
            ? { field: "links", message: prepared.error, linkRowKey: prepared.linkRowKey }
            : { field: "price", message: prepared.error },
        );
        return;
      }
      const created = await repository.createGiftsWithLinks({
        ...prepared.value.fields,
        name: giftName,
        personIds: recipients,
        links: prepared.value.links,
        tagIds: prepared.value.tagIds,
      });
      // Keeps the duplicate hint accurate for "Uložit a přidat další".
      setGifts((current) => [...current, ...created]);
      showToast(recipients.length === 1 ? "Uloženo" : `Uloženo – ${formatCount(recipients.length, GIFT_FORMS)}`);
      if (addAnother) {
        // A fresh gift for the same recipients: name and details start over.
        setName("");
        setDetails(DEFAULT_GIFT_DETAILS);
        nameRef.current?.focus();
      } else {
        goBack(closeTo);
      }
    } catch {
      setError({ field: "save", message: "Dárek se nepodařilo uložit. Zkuste to prosím znovu." });
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void save(false);
  }

  const errorId = `${id}-error`;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <fieldset className="field" aria-describedby={error?.field === "recipients" ? errorId : undefined}>
        <legend className="field__label">Pro koho</legend>
        {people.length > 0 && (
          <div className="chip-group">
            {people.map((person) => (
              <label key={person.id} className="chip">
                <input
                  type="checkbox"
                  checked={recipientIds.includes(person.id)}
                  onChange={() => toggleRecipient(person.id)}
                />
                <span className="chip__body">
                  <PersonAvatar seed={person.avatarSeed} name={person.name} photo={person.photo} size={24} />
                  {person.name}
                </span>
              </label>
            ))}
            {!addingPerson && (
              <button
                type="button"
                className="chip-button"
                onClick={() => {
                  setAddingPerson(true);
                  // Focus after the field renders.
                  window.setTimeout(() => newPersonRef.current?.focus(), 0);
                }}
              >
                <PlusIcon />
                Nová osoba
              </button>
            )}
          </div>
        )}
        {addingPerson && (
          <div className="inline-form">
            <label className="field__hint" htmlFor={`${id}-person`}>
              {people.length === 0 ? "Zatím tu nikdo není. Napište jméno, pro koho dárek je:" : "Jméno nové osoby"}
            </label>
            <div className="inline-form__row">
              <input
                id={`${id}-person`}
                ref={newPersonRef}
                value={newPersonName}
                maxLength={PERSON_NAME_MAX_LENGTH}
                autoComplete="off"
                autoCapitalize="words"
                autoFocus={people.length === 0}
                placeholder="např. Jana"
                aria-invalid={error?.field === "person"}
                onKeyDown={handleNewPersonKeyDown}
                onChange={(event) => setNewPersonName(event.target.value)}
              />
              <button type="button" className="button button--secondary" disabled={saving} onClick={handleAddPerson}>
                Přidat
              </button>
            </div>
            {people.length > 0 && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setAddingPerson(false);
                  setNewPersonName("");
                }}
              >
                Zrušit
              </button>
            )}
          </div>
        )}
        {recipientIds.length > 1 && (
          <p className="field__hint">Každý vybraný člověk dostane vlastní samostatný dárek.</p>
        )}
      </fieldset>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-name`}>
          Název dárku
        </label>
        <input
          id={`${id}-name`}
          ref={nameRef}
          value={name}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="off"
          autoFocus={recipientIds.length > 0}
          placeholder="např. Lego Technic"
          aria-invalid={error?.field === "name"}
          aria-describedby={error?.field === "name" ? errorId : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        {similar !== undefined && similarOwner !== undefined && (
          <p className="field__hint" role="status">
            Podobný nápad u osoby {similarOwner.name} už je: „{similar.name}“. Uložit ho můžete i tak.
          </p>
        )}
      </div>

      <GiftDetailsFields
        value={details}
        onChange={setDetails}
        people={people}
        tags={tags}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        invalidLinkRowKey={error?.field === "links" ? error.linkRowKey : undefined}
        invalidPrice={error?.field === "price"}
      />

      {error !== null && (
        <p id={errorId} className="form__error" role="alert">
          {error.message}
        </p>
      )}

      <div className="form__actions form__actions--stacked">
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? "Ukládám…" : "Uložit"}
        </button>
        <button type="button" className="button button--secondary" disabled={saving} onClick={() => void save(true)}>
          Uložit a přidat další
        </button>
        <button type="button" className="button button--ghost" disabled={saving} onClick={() => goBack(closeTo)}>
          Zrušit
        </button>
      </div>
    </form>
  );
}

/** Quick add: recipient(s) → gift name → Uložit (PRODUCT.md §11). */
export function QuickAddScreen({ personId, shared }: { personId: number | null; shared: SharedContent | null }) {
  const { repository } = useApp();
  const load = useCallback(async () => {
    const [people, gifts, tags] = await Promise.all([
      repository.listPeople(),
      repository.listGifts(),
      repository.listTags(),
    ]);
    return { people, gifts, tags: [...tags].sort(compareTagsByName) };
  }, [repository]);
  const options = useLoad(load);
  const closeTo = personId === null ? paths.people() : paths.person(personId);

  return (
    <>
      <ScreenHeader title="Přidat dárek" backFallback={closeTo} />
      {shared !== null && <p className="muted">Nápad ze sdílené stránky. Zkontrolujte název a vyberte, pro koho je.</p>}
      {options.status === "loading" && <StatusMessage kind="loading" />}
      {options.status === "error" && <StatusMessage kind="error" message="Seznam lidí se nepodařilo načíst." />}
      {options.status === "ready" && (
        <QuickAddForm
          initialPeople={options.data.people}
          initialGifts={options.data.gifts}
          tags={options.data.tags}
          preselectedId={personId}
          shared={shared}
          closeTo={closeTo}
        />
      )}
    </>
  );
}
