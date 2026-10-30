import { useCallback, useState } from "react";
import { useApp } from "../../app/AppContext";
import { goBack, paths } from "../../app/routes";
import { PersonAvatar } from "../../components/PersonAvatar";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusMessage } from "../../components/StatusMessage";
import { useLoad } from "../../lib/useLoad";
import { AvatarPicker } from "./AvatarPicker";

export function ChangeAvatarScreen({ personId }: { personId: number }) {
  const { repository } = useApp();
  const load = useCallback(() => repository.getPerson(personId), [repository, personId]);
  const result = useLoad(load);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function select(seed: string) {
    setSaving(true);
    setFailed(false);
    try {
      await repository.updatePerson(personId, { avatarSeed: seed });
      goBack(paths.person(personId));
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  return (
    <>
      <ScreenHeader title="Změnit avatara" backFallback={paths.person(personId)} />
      {result.status === "loading" && <StatusMessage kind="loading" />}
      {result.status === "error" && <StatusMessage kind="error" message="Osobu se nepodařilo načíst." />}
      {result.status === "ready" && result.data === undefined && (
        <StatusMessage kind="error" message="Tato osoba neexistuje." />
      )}
      {result.status === "ready" && result.data !== undefined && (
        <section className="change-avatar">
          <div className="change-avatar__current">
            <PersonAvatar seed={result.data.avatarSeed} name={result.data.name} size={72} />
            <p>Současný avatar. Vyberte novou variantu:</p>
          </div>
          {failed && <StatusMessage kind="error" message="Avatar se nepodařilo uložit. Zkuste to prosím znovu." />}
          <AvatarPicker name={result.data.name} onSelect={select} disabled={saving} />
        </section>
      )}
    </>
  );
}
