import { useCallback, useId, useState, type FormEvent } from "react";
import { useApp } from "../../app/AppContext";
import { paths } from "../../app/routes";
import { Dialog } from "../../components/Dialog";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusMessage } from "../../components/StatusMessage";
import { PencilIcon, TrashIcon } from "../../components/icons";
import type { Tag } from "../../domain/entities";
import { compareTagsByName } from "../../domain/sorting";
import { formatCount, GIFT_FORMS, GIFT_GENITIVE_FORMS } from "../../lib/plural";
import { useLoad } from "../../lib/useLoad";

const TAG_NAME_MAX_LENGTH = 40;

/**
 * Repository validation errors carry Czech messages meant for the user (e.g. a
 * duplicate name). Raw IndexedDB errors (DOMException) get a generic message.
 */
function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && !(error instanceof DOMException) ? error.message : fallback;
}

function NewTagForm({ onCreated }: { onCreated(): void }) {
  const { repository } = useApp();
  const id = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim() === "") {
      setError("Vyplňte název štítku.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await repository.createTag({ name });
      setName("");
      onCreated();
    } catch (createError) {
      setError(messageOf(createError, "Štítek se nepodařilo vytvořit."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit} noValidate>
      <label className="field__label" htmlFor={id}>
        Nový štítek
      </label>
      <div className="inline-form__row">
        <input
          id={id}
          value={name}
          maxLength={TAG_NAME_MAX_LENGTH}
          autoComplete="off"
          placeholder="např. Svatba"
          aria-invalid={error !== null}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" className="button button--primary" disabled={saving}>
          Přidat
        </button>
      </div>
      {error !== null && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function TagRow({ tag, usage, onChanged, onDelete }: {
  tag: Tag;
  usage: number;
  onChanged(): void;
  onDelete(): void;
}) {
  const { repository } = useApp();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    if (name.trim() === "") {
      setError("Vyplňte název štítku.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await repository.renameTag(tag.id, name);
      setEditing(false);
      onChanged();
    } catch (renameError) {
      setError(messageOf(renameError, "Štítek se nepodařilo přejmenovat."));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li className="tag-row">
        <form className="inline-form" onSubmit={handleRename} noValidate>
          <label className="visually-hidden" htmlFor={id}>
            Nový název štítku {tag.name}
          </label>
          <div className="inline-form__row">
            <input
              id={id}
              value={name}
              maxLength={TAG_NAME_MAX_LENGTH}
              autoComplete="off"
              autoFocus
              aria-invalid={error !== null}
              onChange={(event) => setName(event.target.value)}
            />
            <button type="submit" className="button button--primary" disabled={saving}>
              Uložit
            </button>
          </div>
          <button
            type="button"
            className="text-button"
            disabled={saving}
            onClick={() => {
              setEditing(false);
              setName(tag.name);
              setError(null);
            }}
          >
            Zrušit
          </button>
          {error !== null && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className="tag-row">
      <span className="tag-row__text">
        <span className="tag-row__name">{tag.name}</span>
        <span className="tag-row__meta">{formatCount(usage, GIFT_FORMS)}</span>
      </span>
      <button
        type="button"
        className="icon-button"
        aria-label={`Přejmenovat štítek ${tag.name}`}
        title="Přejmenovat"
        onClick={() => setEditing(true)}
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        className="icon-button icon-button--danger"
        aria-label={`Smazat štítek ${tag.name}`}
        title="Smazat"
        onClick={onDelete}
      >
        <TrashIcon />
      </button>
    </li>
  );
}

function DeleteTagDialog({ tag, usage, onClose, onDeleted }: {
  tag: Tag;
  usage: number;
  onClose(): void;
  onDeleted(): void;
}) {
  const { repository } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    setFailed(false);
    try {
      await repository.deleteTag(tag.id);
      onDeleted();
    } catch {
      setFailed(true);
      setDeleting(false);
    }
  }

  return (
    <Dialog
      title={`Smazat štítek „${tag.name}“?`}
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
      <p>
        {usage === 0
          ? "Štítek není u žádného dárku."
          : `Štítek se odebere z ${formatCount(usage, GIFT_GENITIVE_FORMS)}. Dárky samotné zůstanou.`}
      </p>
      <p>Tuto akci nelze vrátit.</p>
      {failed && <StatusMessage kind="error" message="Štítek se nepodařilo smazat. Zkuste to prosím znovu." />}
    </Dialog>
  );
}

export function TagsScreen() {
  const { repository } = useApp();
  const [deleting, setDeleting] = useState<Tag | null>(null);
  const load = useCallback(async () => {
    const [tags, giftTags] = await Promise.all([repository.listTags(), repository.listAllGiftTags()]);
    const usage = new Map<number, number>();
    giftTags.forEach(({ tagId }) => usage.set(tagId, (usage.get(tagId) ?? 0) + 1));
    return { tags: [...tags].sort(compareTagsByName), usage };
  }, [repository]);
  const result = useLoad(load);

  return (
    <>
      <ScreenHeader title="Štítky" backFallback={paths.settings()} />
      <section className="section">
        <NewTagForm onCreated={result.reload} />
      </section>
      <section className="section" aria-label="Seznam štítků">
        {result.status === "loading" && <StatusMessage kind="loading" />}
        {result.status === "error" && <StatusMessage kind="error" message="Štítky se nepodařilo načíst." />}
        {result.status === "ready" && result.data.tags.length === 0 && (
          <div className="empty-state empty-state--compact">
            <p className="empty-state__title">Zatím nemáte žádné štítky.</p>
            <p>Štítky pomáhají třídit dárky, třeba podle příležitosti (Vánoce, Narozeniny…).</p>
          </div>
        )}
        {result.status === "ready" && result.data.tags.length > 0 && (
          <ul className="tag-list">
            {result.data.tags.map((tag) => (
              <TagRow
                key={`${tag.id}-${tag.name}`}
                tag={tag}
                usage={result.data.usage.get(tag.id) ?? 0}
                onChanged={result.reload}
                onDelete={() => setDeleting(tag)}
              />
            ))}
          </ul>
        )}
      </section>
      {deleting !== null && result.status === "ready" && (
        <DeleteTagDialog
          tag={deleting}
          usage={result.data.usage.get(deleting.id) ?? 0}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            result.reload();
          }}
        />
      )}
    </>
  );
}
