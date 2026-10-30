import { useCallback, useId, useState, type ChangeEvent, type FormEvent } from "react";
import { useApp } from "../../app/AppContext";
import { goBack, paths, replaceRoute } from "../../app/routes";
import { Dialog } from "../../components/Dialog";
import { PersonAvatar } from "../../components/PersonAvatar";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusMessage } from "../../components/StatusMessage";
import type { Person } from "../../domain/entities";
import { createAvatarSeed } from "../../lib/avatar";
import { INITIAL_CROP_VIEW, photoOfPerson, toPhotoFields, type PersonPhoto } from "../../domain/photo";
import { decodePhoto, loadPhotoSource, PhotoError } from "../../lib/photo";
import { requestPersistentStorage } from "../../lib/storage";
import { useLoad } from "../../lib/useLoad";
import { AvatarPicker } from "./AvatarPicker";
import { BirthdayInput } from "./BirthdayInput";
import { PhotoCropDialog, type PhotoCropSource } from "./PhotoCropDialog";
import { birthdayToFields, fieldsToBirthday } from "./birthdayFields";

const NAME_MAX_LENGTH = 100;

type PersonFormValues = Pick<Person, "name" | "birthday" | "avatarSeed"> & {
  photo: PersonPhoto | null;
};

type PersonFormProps = {
  initial: PersonFormValues;
  submitLabel: string;
  cancelFallback: string;
  onSubmit(values: PersonFormValues): Promise<void>;
};

function PersonForm({ initial, submitLabel, cancelFallback, onSubmit }: PersonFormProps) {
  const nameId = useId();
  const errorId = useId();
  const [name, setName] = useState(initial.name);
  const [birthday, setBirthday] = useState(() => birthdayToFields(initial.birthday));
  const [avatarSeed, setAvatarSeed] = useState(initial.avatarSeed);
  const [photo, setPhoto] = useState(initial.photo);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  /** Image and crop position while the crop dialog is open. */
  const [cropSource, setCropSource] = useState<PhotoCropSource | null>(null);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [error, setError] = useState<{
    field: "name" | "birthday" | "photo" | "save";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  async function openCrop(load: () => Promise<PhotoCropSource>) {
    setProcessingPhoto(true);
    setError(null);
    try {
      setCropSource(await load());
    } catch (photoError) {
      setError({
        field: "photo",
        message:
          photoError instanceof PhotoError ? photoError.message : "Fotku se nepodařilo zpracovat.",
      });
    } finally {
      setProcessingPhoto(false);
    }
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Reset so picking the same file again still triggers a change.
    input.value = "";
    if (file === undefined) return;
    void openCrop(async () => ({ image: await decodePhoto(file), source: null, view: INITIAL_CROP_VIEW }));
  }

  function editPhoto(current: PersonPhoto) {
    void openCrop(async () => ({
      image: await loadPhotoSource(current.photoSource),
      source: current.photoSource,
      view: current.photoCrop,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim() === "") {
      setError({ field: "name", message: "Vyplňte jméno." });
      return;
    }
    const birthdayResult = fieldsToBirthday(birthday, new Date().getFullYear());
    if (!birthdayResult.ok) {
      setError({ field: "birthday", message: birthdayResult.error });
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), birthday: birthdayResult.value, avatarSeed, photo });
    } catch {
      setError({ field: "save", message: "Osobu se nepodařilo uložit. Zkuste to prosím znovu." });
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="avatar-field">
        <PersonAvatar
          seed={avatarSeed}
          name={name}
          photo={photo?.photo ?? null}
          size={88}
          label={photo === null ? "Avatar" : "Fotka"}
        />
        <div className="avatar-field__actions">
          {photo === null ? (
            <label className="button button--secondary file-button" aria-disabled={processingPhoto}>
              <input
                type="file"
                accept="image/*"
                className="visually-hidden"
                disabled={processingPhoto || saving}
                onChange={handlePhotoChange}
              />
              {processingPhoto ? "Načítám…" : "Nahrát fotku"}
            </label>
          ) : (
            <button
              type="button"
              className="button button--secondary"
              disabled={processingPhoto || saving}
              onClick={() => editPhoto(photo)}
            >
              {processingPhoto ? "Načítám…" : "Změnit fotku"}
            </button>
          )}
          {photo === null ? (
            <button
              type="button"
              className="button button--ghost"
              disabled={saving}
              onClick={() => setPickingAvatar(true)}
            >
              Změnit avatara
            </button>
          ) : (
            <button
              type="button"
              className="button button--ghost"
              disabled={processingPhoto || saving}
              onClick={() => setPhoto(null)}
            >
              Odebrat fotku
            </button>
          )}
        </div>
        <p className="field__hint avatar-field__hint">
          Fotka zůstane jen v tomto zařízení a v záloze dat.
        </p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={nameId}>
          Jméno
        </label>
        <input
          id={nameId}
          value={name}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="words"
          required
          aria-invalid={error?.field === "name"}
          aria-describedby={error?.field === "name" ? errorId : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="field__hint">Stačí přezdívka nebo iniciály.</p>
      </div>

      <BirthdayInput value={birthday} onChange={setBirthday} invalid={error?.field === "birthday"} />

      {error !== null && (
        <p id={errorId} className="form__error" role="alert">
          {error.message}
        </p>
      )}

      <div className="form__actions">
        <button type="submit" className="button button--primary" disabled={saving || processingPhoto}>
          {saving ? "Ukládám…" : submitLabel}
        </button>
        <button
          type="button"
          className="button button--ghost"
          disabled={saving}
          onClick={() => goBack(cancelFallback)}
        >
          Zrušit
        </button>
      </div>

      {cropSource !== null && (
        <PhotoCropDialog
          initial={cropSource}
          onCancel={() => setCropSource(null)}
          onApply={(edited) => {
            setCropSource(null);
            setPhoto(edited);
          }}
        />
      )}

      {pickingAvatar && (
        <Dialog
          title="Změnit avatara"
          onClose={() => setPickingAvatar(false)}
          footer={
            <button type="button" className="button button--ghost" onClick={() => setPickingAvatar(false)}>
              Zavřít
            </button>
          }
        >
          <AvatarPicker
            name={name}
            onSelect={(seed) => {
              setAvatarSeed(seed);
              setPickingAvatar(false);
            }}
          />
        </Dialog>
      )}
    </form>
  );
}

export function NewPersonScreen() {
  const { repository } = useApp();
  const [initial] = useState<PersonFormValues>(() => ({
    name: "",
    birthday: null,
    avatarSeed: createAvatarSeed(),
    photo: null,
  }));

  return (
    <>
      <ScreenHeader title="Nová osoba" backFallback={paths.people()} />
      <PersonForm
        initial={initial}
        submitLabel="Přidat osobu"
        cancelFallback={paths.people()}
        onSubmit={async (values) => {
          const person = await repository.createPerson({ ...values, ...toPhotoFields(values.photo) });
          // Saving a person is a good moment to ask for persistent storage (PRODUCT.md §14).
          void requestPersistentStorage();
          replaceRoute(paths.person(person.id));
        }}
      />
    </>
  );
}

export function EditPersonScreen({ personId }: { personId: number }) {
  const { repository } = useApp();
  const load = useCallback(() => repository.getPerson(personId), [repository, personId]);
  const person = useLoad(load);

  return (
    <>
      <ScreenHeader title="Upravit osobu" backFallback={paths.person(personId)} />
      {person.status === "loading" && <StatusMessage kind="loading" />}
      {person.status === "error" && <StatusMessage kind="error" message="Osobu se nepodařilo načíst." />}
      {person.status === "ready" && person.data === undefined && (
        <StatusMessage kind="error" message="Tato osoba už neexistuje." />
      )}
      {person.status === "ready" && person.data !== undefined && (
        <PersonForm
          initial={{ ...person.data, photo: photoOfPerson(person.data) }}
          submitLabel="Uložit"
          cancelFallback={paths.person(personId)}
          onSubmit={async (values) => {
            await repository.updatePerson(personId, { ...values, ...toPhotoFields(values.photo) });
            goBack(paths.person(personId));
          }}
        />
      )}
    </>
  );
}
