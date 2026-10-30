import { useId } from "react";
import { ArrowDownIcon, ArrowUpIcon, ExternalIcon, PlusIcon, TrashIcon } from "../../components/icons";
import { isHttpUrl, linkLabel, normalizeLinkUrl } from "../../domain/links";
import { moveRow, newLinkRow, type LinkRow } from "./linkRows";

type LinksEditorProps = {
  rows: LinkRow[];
  onChange(rows: LinkRow[]): void;
  /** Row with a validation error, highlighted. */
  invalidRowKey?: string;
};

/** Editable list of gift links: URL + optional title, move up/down, remove, open externally. */
export function LinksEditor({ rows, onChange, invalidRowKey }: LinksEditorProps) {
  const id = useId();

  function update(key: string, change: Partial<LinkRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
  }

  return (
    <fieldset className="field links-editor">
      <legend className="field__label">Odkazy</legend>
      {rows.length === 0 && <p className="field__hint">Zatím žádné odkazy.</p>}
      <ol className="links-editor__list">
        {rows.map((row, index) => {
          const url = normalizeLinkUrl(row.url);
          const openable = isHttpUrl(url);
          const number = index + 1;
          return (
            <li key={row.key} className="links-editor__row">
              <div className="links-editor__fields">
                <label className="visually-hidden" htmlFor={`${id}-url-${row.key}`}>
                  Adresa odkazu {number}
                </label>
                <input
                  id={`${id}-url-${row.key}`}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://…"
                  value={row.url}
                  aria-invalid={invalidRowKey === row.key}
                  onChange={(event) => update(row.key, { url: event.target.value })}
                />
                <label className="visually-hidden" htmlFor={`${id}-title-${row.key}`}>
                  Název odkazu {number} (nepovinné)
                </label>
                <input
                  id={`${id}-title-${row.key}`}
                  autoComplete="off"
                  maxLength={100}
                  placeholder="Název (nepovinné)"
                  value={row.title}
                  onChange={(event) => update(row.key, { title: event.target.value })}
                />
              </div>
              <div className="links-editor__actions">
                {openable && (
                  <a
                    className="icon-button"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Otevřít ${linkLabel({ url, title: row.title })} v novém okně`}
                  >
                    <ExternalIcon />
                  </a>
                )}
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Posunout odkaz ${number} nahoru`}
                  disabled={index === 0}
                  onClick={() => onChange(moveRow(rows, index, -1))}
                >
                  <ArrowUpIcon />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Posunout odkaz ${number} dolů`}
                  disabled={index === rows.length - 1}
                  onClick={() => onChange(moveRow(rows, index, 1))}
                >
                  <ArrowDownIcon />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Odebrat odkaz ${number}`}
                  onClick={() => onChange(rows.filter((other) => other.key !== row.key))}
                >
                  <TrashIcon />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" className="button button--secondary" onClick={() => onChange([...rows, newLinkRow()])}>
        <PlusIcon />
        Přidat odkaz
      </button>
      <p className="field__hint">Název se nenačítá automaticky, můžete ho napsat sami.</p>
    </fieldset>
  );
}
