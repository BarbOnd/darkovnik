import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import { goBack, navigate, paths } from "../../app/routes";
import { Dialog } from "../../components/Dialog";
import { PersonAvatar } from "../../components/PersonAvatar";
import { QuickAddButton } from "../../components/QuickAddButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusMessage } from "../../components/StatusMessage";
import { CakeIcon, MoreIcon } from "../../components/icons";
import type { PersonDeletionImpact } from "../../db/repository";
import type { Person } from "../../domain/entities";
import { GiftList } from "../gifts/GiftList";
import { formatBirthdayCs } from "../../lib/format";
import { useLoad } from "../../lib/useLoad";
import { personDeletionText } from "./deletionText";

/** Avatar and photo are changed in "Upravit" (person form), not from this menu. */
function PersonMenu({ onEdit, onDelete }: { onEdit(): void; onDelete(): void }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="menu" ref={containerRef}>
      <button
        type="button"
        className="icon-button"
        aria-label="Další akce"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreIcon />
      </button>
      {open && (
        <ul id={menuId} className="menu__list">
          <li>
            <button type="button" className="menu__item" onClick={() => choose(onEdit)}>
              Upravit
            </button>
          </li>
          <li>
            <button type="button" className="menu__item menu__item--danger" onClick={() => choose(onDelete)}>
              Smazat
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

function DeletePersonDialog({ person, impact, onClose }: {
  person: Person;
  impact: PersonDeletionImpact;
  onClose(): void;
}) {
  const { repository } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    setFailed(false);
    try {
      await repository.deletePerson(person.id);
      goBack(paths.people());
    } catch {
      setFailed(true);
      setDeleting(false);
    }
  }

  return (
    <Dialog
      title={`Smazat osobu ${person.name}?`}
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
      {personDeletionText(impact).map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {failed && <StatusMessage kind="error" message="Osobu se nepodařilo smazat. Zkuste to prosím znovu." />}
    </Dialog>
  );
}

export function PersonDetailScreen({ personId }: { personId: number }) {
  const { repository } = useApp();
  const load = useCallback(() => repository.getPerson(personId), [repository, personId]);
  const result = useLoad(load);
  const [deletion, setDeletion] = useState<PersonDeletionImpact | null>(null);
  const [actionError, setActionError] = useState(false);

  const person = result.status === "ready" ? result.data : undefined;

  return (
    <>
      <ScreenHeader
        title={person?.name ?? "Osoba"}
        backFallback={paths.people()}
        actions={
          person !== undefined && (
            <PersonMenu
              onEdit={() => navigate(paths.personEdit(person.id))}
              onDelete={() => {
                setActionError(false);
                repository
                  .getPersonDeletionImpact(person.id)
                  .then(setDeletion, () => setActionError(true));
              }}
            />
          )
        }
      />

      {result.status === "loading" && <StatusMessage kind="loading" />}
      {result.status === "error" && <StatusMessage kind="error" message="Osobu se nepodařilo načíst." />}
      {result.status === "ready" && person === undefined && (
        <StatusMessage kind="error" message="Tato osoba neexistuje. Možná byla smazána." />
      )}
      {actionError && <StatusMessage kind="error" message="Akci se nepodařilo provést. Zkuste to prosím znovu." />}

      {person !== undefined && (
        <section className="person-detail">
          <PersonAvatar seed={person.avatarSeed} name={person.name} photo={person.photo} size={96} />
          {person.birthday !== null && (
            <p className="person-detail__birthday">
              <CakeIcon className="inline-icon" />
              <span className="visually-hidden">Narozeniny: </span>
              {formatBirthdayCs(person.birthday)}
            </p>
          )}
        </section>
      )}
      {person !== undefined && <GiftList person={person} />}
      {person !== undefined && <QuickAddButton personId={person.id} />}

      {person !== undefined && deletion !== null && (
        <DeletePersonDialog person={person} impact={deletion} onClose={() => setDeletion(null)} />
      )}
    </>
  );
}
