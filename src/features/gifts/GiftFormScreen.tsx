import { useCallback, useId, useState, type FormEvent } from "react";
import { useApp } from "../../app/AppContext";
import { goBack, paths } from "../../app/routes";
import { Dialog } from "../../components/Dialog";
import { PersonAvatar } from "../../components/PersonAvatar";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusMessage } from "../../components/StatusMessage";
import type { GiftLinkDraft } from "../../db/repository";
import {
  GIFT_PRIORITIES,
  GIFT_STATUSES,
  type Gift,
  type GiftPriority,
  type GiftStatus,
  type Person,
} from "../../domain/entities";
import { comparePeopleByName } from "../../domain/sorting";
import { useLoad } from "../../lib/useLoad";
import { LinksEditor } from "./LinksEditor";
import { PRIORITY_LABELS, STATUS_LABELS } from "./labels";
import { linkRowsFrom, linkRowsToDrafts, type LinkRow } from "./linkRows";

const NAME_MAX_LENGTH = 200;
const NOTE_MAX_LENGTH = 2000;

type GiftFormValues = {
  recipientIds: number[];
  name: string;
  note: string;
  priority: GiftPriority;
  status: GiftStatus;
  buyerPersonId: number | null;
  links: LinkRow[];
};

type GiftFormSubmit = Omit<GiftFormValues, "links" | "name" | "note"> & {
  name: string;
  note: string;
  links: GiftLinkDraft[];
};

type GiftFormProps = {
  /** "new": several recipients create independent gifts; "edit": exactly one recipient. */
  mode: "new" | "edit";
  people: Person[];
  initial: GiftFormValues;
  submitLabel: string;
  cancelFallback: string;
  onSubmit(values: GiftFormSubmit): Promise<void>;
  onDelete?(): void;
};

type FormError = { field: "recipients" | "name" | "links" | "save"; message: string; rowKey?: string };

function GiftForm({ mode, people, initial, submitLabel, cancelFallback, onSubmit, onDelete }: GiftFormProps) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<FormError | null>(null);
  const [saving, setSaving] = useState(false);
  const sortedPeople = [...people].sort(comparePeopleByName);

  function set<K extends keyof GiftFormValues>(field: K, value: GiftFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function toggleRecipient(personId: number) {
    set(
      "recipientIds",
      values.recipientIds.includes(personId)
        ? values.recipientIds.filter((other) => other !== personId)
        : [...values.recipientIds, personId],
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (values.recipientIds.length === 0) {
      setError({ field: "recipients", message: "Vyberte alespoň jednoho příjemce." });
      return;
    }
    if (values.name.trim() === "") {
      setError({ field: "name", message: "Vyplňte název dárku." });
      return;
    }
    const links = linkRowsToDrafts(values.links);
    if (!links.ok) {
      setError({ field: "links", message: links.error, rowKey: links.rowKey });
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ ...values, name: values.name.trim(), note: values.note.trim(), links: links.drafts });
    } catch {
      setError({ field: "save", message: "Dárek se nepodařilo uložit. Zkuste to prosím znovu." });
      setSaving(false);
    }
  }

  const errorId = `${id}-error`;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {mode === "new" ? (
        <fieldset className="field" aria-describedby={error?.field === "recipients" ? errorId : undefined}>
          <legend className="field__label">Pro koho</legend>
          <div className="chip-group">
            {sortedPeople.map((person) => (
              <label key={person.id} className="chip">
                <input
                  type="checkbox"
                  checked={values.recipientIds.includes(person.id)}
                  onChange={() => toggleRecipient(person.id)}
                />
                <span className="chip__body">
                  <PersonAvatar seed={person.avatarSeed} name={person.name} photo={person.photo} size={24} />
                  {person.name}
                </span>
              </label>
            ))}
          </div>
          {values.recipientIds.length > 1 && (
            <p className="field__hint">
              Každý vybraný člověk dostane vlastní samostatný dárek. Později je můžete upravovat zvlášť.
            </p>
          )}
        </fieldset>
      ) : (
        <div className="field">
          <label className="field__label" htmlFor={`${id}-recipient`}>
            Pro koho
          </label>
          <select
            id={`${id}-recipient`}
            value={values.recipientIds[0]}
            onChange={(event) => set("recipientIds", [Number(event.target.value)])}
          >
            {sortedPeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
          onChange={(event) => set("name", event.target.value)}
        />
      </div>

      <details className="details" open={mode === "edit"}>
        <summary className="details__summary">Další podrobnosti</summary>
        <div className="details__content">
          <div className="field">
            <label className="field__label" htmlFor={`${id}-buyer`}>
              Kdo koupí
            </label>
            <select
              id={`${id}-buyer`}
              value={values.buyerPersonId ?? ""}
              onChange={(event) =>
                set("buyerPersonId", event.target.value === "" ? null : Number(event.target.value))
              }
            >
              <option value="">Nevybráno</option>
              {sortedPeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="field">
            <legend className="field__label">Priorita</legend>
            <div className="segmented">
              {[...GIFT_PRIORITIES].reverse().map((priority) => (
                <label key={priority} className="segmented__option">
                  <input
                    type="radio"
                    name={`${id}-priority`}
                    value={priority}
                    checked={values.priority === priority}
                    onChange={() => set("priority", priority)}
                  />
                  <span>{PRIORITY_LABELS[priority]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <LinksEditor
            rows={values.links}
            onChange={(links) => set("links", links)}
            invalidRowKey={error?.field === "links" ? error.rowKey : undefined}
          />

          <div className="field">
            <label className="field__label" htmlFor={`${id}-note`}>
              Poznámka
            </label>
            <textarea
              id={`${id}-note`}
              rows={3}
              maxLength={NOTE_MAX_LENGTH}
              value={values.note}
              onChange={(event) => set("note", event.target.value)}
            />
          </div>

          <fieldset className="field">
            <legend className="field__label">Stav</legend>
            <div className="segmented">
              {GIFT_STATUSES.map((status) => (
                <label key={status} className="segmented__option">
                  <input
                    type="radio"
                    name={`${id}-status`}
                    value={status}
                    checked={values.status === status}
                    onChange={() => set("status", status)}
                  />
                  <span>{STATUS_LABELS[status]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>

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

export function NewGiftScreen({ personId }: { personId: number }) {
  const { repository } = useApp();
  const load = useCallback(() => repository.listPeople(), [repository]);
  const people = useLoad(load);
  const recipientExists = people.status === "ready" && people.data.some((person) => person.id === personId);

  return (
    <>
      <ScreenHeader title="Nový dárek" backFallback={paths.person(personId)} />
      {people.status === "loading" && <StatusMessage kind="loading" />}
      {people.status === "error" && <StatusMessage kind="error" message="Seznam lidí se nepodařilo načíst." />}
      {people.status === "ready" && !recipientExists && (
        <StatusMessage kind="error" message="Tato osoba neexistuje. Možná byla smazána." />
      )}
      {people.status === "ready" && recipientExists && (
        <GiftForm
          mode="new"
          people={people.data}
          initial={{
            recipientIds: [personId],
            name: "",
            note: "",
            priority: "MEDIUM",
            status: "NEW",
            buyerPersonId: null,
            links: [],
          }}
          submitLabel="Přidat dárek"
          cancelFallback={paths.person(personId)}
          onSubmit={async ({ recipientIds, ...fields }) => {
            await repository.createGiftsWithLinks({ ...fields, personIds: recipientIds });
            goBack(paths.person(personId));
          }}
        />
      )}
    </>
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
  const { repository } = useApp();
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(async () => {
    const gift = await repository.getGift(giftId);
    if (gift === undefined) return undefined;
    const [links, people] = await Promise.all([repository.listGiftLinks(giftId), repository.listPeople()]);
    return { gift, links, people };
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
          mode="edit"
          people={data.people}
          initial={{
            recipientIds: [data.gift.personId],
            name: data.gift.name,
            note: data.gift.note,
            priority: data.gift.priority,
            status: data.gift.status,
            buyerPersonId: data.gift.buyerPersonId,
            links: linkRowsFrom(data.links),
          }}
          submitLabel="Uložit"
          cancelFallback={paths.person(data.gift.personId)}
          onSubmit={async ({ recipientIds, links, ...fields }) => {
            await repository.saveGiftWithLinks(giftId, { ...fields, personId: recipientIds[0] }, links);
            goBack(paths.person(data.gift.personId));
          }}
          onDelete={() => setDeleting(true)}
        />
      )}
      {data !== undefined && deleting && <DeleteGiftDialog gift={data.gift} onClose={() => setDeleting(false)} />}
    </>
  );
}
