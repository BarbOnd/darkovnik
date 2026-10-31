import { useCallback, useId, useState, type FormEvent } from "react";
import { useApp } from "../../app/AppContext";
import { goBack, paths, replaceRoute } from "../../app/routes";
import { Dialog } from "../../components/Dialog";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusMessage } from "../../components/StatusMessage";
import type { Gift, Person, Tag } from "../../domain/entities";
import { comparePeopleByName, compareTagsByName } from "../../domain/sorting";
import { useLoad } from "../../lib/useLoad";
import { GiftDetailsFields } from "./GiftDetailsFields";
import { prepareGiftDetails, type GiftDetails, type PreparedGiftDetails } from "./giftDetails";
import { linkRowsFrom } from "./linkRows";

const NAME_MAX_LENGTH = 200;

type GiftFormValues = {
  recipientId: number;
  name: string;
  details: GiftDetails;
};

type GiftFormSubmit = PreparedGiftDetails & { recipientId: number; name: string };

/** Full gift form for editing; new gifts are created through quick add (PRODUCT.md §11). */
type GiftFormProps = {
  people: Person[];
  tags: Tag[];
  initial: GiftFormValues;
  submitLabel: string;
  cancelFallback: string;
  onSubmit(values: GiftFormSubmit): Promise<void>;
  onDelete?(): void;
};

type FormError = { field: "name" | "links" | "save"; message: string; rowKey?: string };

function GiftForm({ people, tags, initial, submitLabel, cancelFallback, onSubmit, onDelete }: GiftFormProps) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [error, setError] = useState<FormError | null>(null);
  const [saving, setSaving] = useState(false);
  const sortedPeople = [...people].sort(comparePeopleByName);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (values.name.trim() === "") {
      setError({ field: "name", message: "Vyplňte název dárku." });
      return;
    }
    const details = prepareGiftDetails(values.details);
    if (!details.ok) {
      setDetailsOpen(true);
      setError({ field: "links", message: details.error, rowKey: details.linkRowKey });
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ ...details.value, recipientId: values.recipientId, name: values.name.trim() });
    } catch {
      setError({ field: "save", message: "Dárek se nepodařilo uložit. Zkuste to prosím znovu." });
      setSaving(false);
    }
  }

  const errorId = `${id}-error`;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-recipient`}>
          Pro koho
        </label>
        <select
          id={`${id}-recipient`}
          value={values.recipientId}
          onChange={(event) => setValues((current) => ({ ...current, recipientId: Number(event.target.value) }))}
        >
          {sortedPeople.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-name`}>
          Název dárku
        </label>
        <input
          id={`${id}-name`}
          value={values.name}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="off"
          required
          aria-invalid={error?.field === "name"}
          aria-describedby={error?.field === "name" ? errorId : undefined}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
        />
      </div>

      <GiftDetailsFields
        value={values.details}
        onChange={(details) => setValues((current) => ({ ...current, details }))}
        people={sortedPeople}
        tags={tags}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        invalidLinkRowKey={error?.field === "links" ? error.rowKey : undefined}
      />

      {error !== null && (
        <p id={errorId} className="form__error" role="alert">
          {error.message}
        </p>
      )}

      <div className="form__actions">
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? "Ukládám…" : submitLabel}
        </button>
        <button type="button" className="button button--ghost" disabled={saving} onClick={() => goBack(cancelFallback)}>
          Zrušit
        </button>
      </div>

      {onDelete !== undefined && (
        <div className="form__danger">
          <button type="button" className="button button--danger-ghost" disabled={saving} onClick={onDelete}>
            Smazat dárek
          </button>
        </div>
      )}
    </form>
  );
}

function DeleteGiftDialog({ gift, onClose }: { gift: Gift; onClose(): void }) {
  const { repository } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    setFailed(false);
    try {
      await repository.deleteGift(gift.id);
      goBack(paths.person(gift.personId));
    } catch {
      setFailed(true);
      setDeleting(false);
    }
  }

  return (
    <Dialog
      title={`Smazat dárek „${gift.name}“?`}
      onClose={() => !deleting && onClose()}
      footer={
        <>
          <button type="button" className="button button--ghost" disabled={deleting} onClick={onClose}>
            Zrušit
          </button>
          <button type="button" className="button button--danger" disabled={deleting} onClick={confirmDelete}>
            {deleting ? "Mažu…" : "Smazat"}
          </button>
        </>
      }
    >
      <p>Smažou se i jeho odkazy. Tuto akci nelze vrátit.</p>
      {failed && <StatusMessage kind="error" message="Dárek se nepodařilo smazat. Zkuste to prosím znovu." />}
    </Dialog>
  );
}

export function EditGiftScreen({ giftId }: { giftId: number }) {
  const { repository, showToast } = useApp();
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(async () => {
    const gift = await repository.getGift(giftId);
    if (gift === undefined) return undefined;
    const [links, people, tags, tagIds] = await Promise.all([
      repository.listGiftLinks(giftId),
      repository.listPeople(),
      repository.listTags(),
      repository.listGiftTagIds(giftId),
    ]);
    return { gift, links, people, tags: [...tags].sort(compareTagsByName), tagIds };
  }, [repository, giftId]);
  const result = useLoad(load);
  const data = result.status === "ready" ? result.data : undefined;

  return (
    <>
      <ScreenHeader
        title="Upravit dárek"
        backFallback={data === undefined ? paths.people() : paths.person(data.gift.personId)}
      />
      {result.status === "loading" && <StatusMessage kind="loading" />}
      {result.status === "error" && <StatusMessage kind="error" message="Dárek se nepodařilo načíst." />}
      {result.status === "ready" && data === undefined && (
        <StatusMessage kind="error" message="Tento dárek neexistuje. Možná byl smazán." />
      )}
      {data !== undefined && (
        <GiftForm
          people={data.people}
          tags={data.tags}
          initial={{
            recipientId: data.gift.personId,
            name: data.gift.name,
            details: {
              buyerPersonId: data.gift.buyerPersonId,
              priority: data.gift.priority,
              tagIds: data.tagIds,
              links: linkRowsFrom(data.links),
              note: data.gift.note,
              status: data.gift.status,
            },
          }}
          submitLabel="Uložit"
          cancelFallback={paths.person(data.gift.personId)}
          onSubmit={async ({ recipientId, name, fields, links, tagIds }) => {
            await repository.saveGiftWithLinks(giftId, { ...fields, name, personId: recipientId }, links, tagIds);
            if (recipientId === data.gift.personId) {
              goBack(paths.person(data.gift.personId));
              return;
            }
            // The gift moved: show it in the new recipient's list instead of the old one, where it vanished.
            const recipient = data.people.find((person) => person.id === recipientId);
            showToast(recipient === undefined ? "Přesunuto k jiné osobě" : `Přesunuto k osobě ${recipient.name}`);
            replaceRoute(paths.person(recipientId));
          }}
          onDelete={() => setDeleting(true)}
        />
      )}
      {data !== undefined && deleting && <DeleteGiftDialog gift={data.gift} onClose={() => setDeleting(false)} />}
    </>
  );
}
