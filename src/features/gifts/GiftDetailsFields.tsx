import { useId } from "react";
import { GIFT_PRIORITIES, GIFT_STATUSES, type Person, type Tag } from "../../domain/entities";
import { LinksEditor } from "./LinksEditor";
import type { GiftDetails } from "./giftDetails";
import { PRIORITY_LABELS, STATUS_LABELS } from "./labels";

const NOTE_MAX_LENGTH = 2000;

type GiftDetailsFieldsProps = {
  value: GiftDetails;
  onChange(value: GiftDetails): void;
  /** People sorted by name (buyer choices). */
  people: Person[];
  /** Tags sorted by name. */
  tags: Tag[];
  open: boolean;
  onOpenChange(open: boolean): void;
  invalidLinkRowKey?: string;
  invalidPrice?: boolean;
};

/** Collapsible "Další podrobnosti": buyer, priority, tags, links, note, status (UI.md → Gift form). */
export function GiftDetailsFields({
  value,
  onChange,
  people,
  tags,
  open,
  onOpenChange,
  invalidLinkRowKey,
  invalidPrice = false,
}: GiftDetailsFieldsProps) {
  const id = useId();

  function set<K extends keyof GiftDetails>(field: K, fieldValue: GiftDetails[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <details
      className="details"
      open={open}
      onToggle={(event) => onOpenChange((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="details__summary">Další podrobnosti</summary>
      <div className="details__content">
        <div className="field">
          <label className="field__label" htmlFor={`${id}-buyer`}>
            Kdo koupí
          </label>
          <select
            id={`${id}-buyer`}
            value={value.buyerPersonId ?? ""}
            onChange={(event) => set("buyerPersonId", event.target.value === "" ? null : Number(event.target.value))}
          >
            <option value="">Nevybráno</option>
            {people.map((person) => (
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
                  checked={value.priority === priority}
                  onChange={() => set("priority", priority)}
                />
                <span>{PRIORITY_LABELS[priority]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label className="field__label" htmlFor={`${id}-price`}>
            Cena (Kč)
          </label>
          <input
            id={`${id}-price`}
            className="price-input"
            inputMode="decimal"
            autoComplete="off"
            placeholder="nepovinné"
            maxLength={16}
            value={value.price}
            aria-invalid={invalidPrice}
            onChange={(event) => set("price", event.target.value)}
          />
        </div>

        <fieldset className="field">
          <legend className="field__label">Štítky</legend>
          {tags.length === 0 ? (
            <p className="field__hint">Zatím nemáte žádné štítky. Vytvoříte je v Nastavení → Štítky.</p>
          ) : (
            <div className="chip-group">
              {tags.map((tag) => (
                <label key={tag.id} className="chip">
                  <input
                    type="checkbox"
                    checked={value.tagIds.includes(tag.id)}
                    onChange={() =>
                      set(
                        "tagIds",
                        value.tagIds.includes(tag.id)
                          ? value.tagIds.filter((other) => other !== tag.id)
                          : [...value.tagIds, tag.id],
                      )
                    }
                  />
                  <span className="chip__body chip__body--text">{tag.name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <LinksEditor rows={value.links} onChange={(links) => set("links", links)} invalidRowKey={invalidLinkRowKey} />

        <div className="field">
          <label className="field__label" htmlFor={`${id}-note`}>
            Poznámka
          </label>
          <textarea
            id={`${id}-note`}
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            value={value.note}
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
                  checked={value.status === status}
                  onChange={() => set("status", status)}
                />
                <span>{STATUS_LABELS[status]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </details>
  );
}
