import { useCallback, useState, type ChangeEvent } from "react";
import { useApp } from "../../app/AppContext";
import { Dialog } from "../../components/Dialog";
import { StatusMessage } from "../../components/StatusMessage";
import { ImportError } from "../../db/repository";
import { backupFileName, parseBackup, type BackupDocument, type EntityCounts } from "../../domain/backup";
import { localDateOf } from "../../domain/birthdays";
import { downloadJson } from "../../lib/download";
import { persistenceState } from "../../lib/storage";
import { useLoad } from "../../lib/useLoad";
import { importSummaryText, lastBackupText, overwriteText, shouldSuggestBackup } from "./backupText";

type Confirmation = { document: BackupDocument; updated: EntityCounts };

const IMPORT_FAILED = "Import se nepodařil. Data zůstala beze změny.";

function ImportConfirmDialog({ updated, onCancel, onConfirm, busy }: {
  updated: EntityCounts;
  onCancel(): void;
  onConfirm(): void;
  busy: boolean;
}) {
  const overwritten = overwriteText(updated);
  return (
    <Dialog
      title="Importovat zálohu?"
      onClose={() => !busy && onCancel()}
      footer={
        <>
          <button type="button" className="button button--ghost" disabled={busy} onClick={onCancel}>
            Zrušit
          </button>
          <button type="button" className="button button--primary" disabled={busy} onClick={onConfirm}>
            {busy ? "Importuji…" : "Importovat"}
          </button>
        </>
      }
    >
      <p>Import sloučí data se stávajícími. Nic se nesmaže.</p>
      <p>
        {overwritten === null
          ? "Žádný stávající záznam se nepřepíše."
          : `Přepíšou se stávající záznamy se stejným ID: ${overwritten}.`}
      </p>
      <p className="field__hint">Pokud si nejste jistí, exportujte nejdřív současná data.</p>
    </Dialog>
  );
}

/** Export, import and storage status (PRODUCT.md §14). */
export function DataSection() {
  const { repository, metadata, updatePreferences, reloadMetadata, showToast } = useApp();
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const load = useCallback(async () => {
    const [fresh, persistence] = await Promise.all([repository.isFreshInstallation(), persistenceState()]);
    return { hasData: !fresh, persistence };
  }, [repository]);
  const status = useLoad(load);
  const today = localDateOf(new Date());

  async function handleExport() {
    setBusy("export");
    setError(null);
    setSummary(null);
    try {
      const document = await repository.exportBackup();
      downloadJson(backupFileName(today), document);
      await updatePreferences({ lastExportAt: new Date().toISOString() });
      showToast("Záloha stažena");
    } catch {
      setError("Zálohu se nepodařilo vytvořit. Zkuste to prosím znovu.");
    } finally {
      setBusy(null);
    }
  }

  async function runImport(document: BackupDocument) {
    setBusy("import");
    try {
      const plan = await repository.importBackup(document);
      setConfirmation(null);
      setSummary(`Import dokončen. ${importSummaryText(plan.added, plan.updated)}`);
      await reloadMetadata();
      status.reload();
    } catch (importError) {
      setConfirmation(null);
      setError(importError instanceof ImportError ? importError.message : IMPORT_FAILED);
    } finally {
      setBusy(null);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Reset so the same file can be chosen again.
    input.value = "";
    if (file === undefined) return;
    setError(null);
    setSummary(null);
    setBusy("import");
    try {
      const parsed = parseBackup(await file.text());
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const preview = await repository.previewImport(parsed.value);
      if (!preview.ok) {
        setError(preview.error);
        return;
      }
      if (preview.value.fresh) {
        // Nothing to overwrite: import directly (imported tags replace the default ones).
        await runImport(parsed.value);
      } else {
        setConfirmation({ document: parsed.value, updated: preview.value.updated });
      }
    } catch {
      setError("Soubor se nepodařilo přečíst.");
    } finally {
      setBusy((current) => (current === "import" ? null : current));
    }
  }

  return (
    <section className="section" aria-labelledby="data-heading">
      <h2 id="data-heading" className="section__title">
        Data
      </h2>
      <div className="data-actions">
        <button
          type="button"
          className="button button--secondary"
          disabled={busy !== null}
          onClick={() => void handleExport()}
        >
          {busy === "export" ? "Exportuji…" : "Exportovat data"}
        </button>
        <label className="button button--ghost file-button" aria-disabled={busy !== null}>
          <input
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            disabled={busy !== null}
            onChange={(event) => void handleFile(event)}
          />
          {busy === "import" ? "Importuji…" : "Importovat data"}
        </label>
      </div>

      <p className="muted">{lastBackupText(metadata.lastExportAt, today)}</p>
      {status.status === "ready" && shouldSuggestBackup(status.data.hasData, metadata.lastExportAt, today) && (
        <p className="field__hint">
          Tip: zálohu si občas stáhněte. Hodí se hlavně při výměně telefonu – data jsou uložená jen v tomto zařízení.
        </p>
      )}
      {status.status === "ready" && (
        <p className="field__hint">
          {status.data.persistence === "persisted"
            ? "Data jsou uložena trvale."
            : "Prohlížeč může data při nedostatku místa smazat – pravidelně zálohujte."}
        </p>
      )}

      {error !== null && <StatusMessage kind="error" message={error} />}
      {summary !== null && (
        <p className="status-message" role="status">
          {summary}
        </p>
      )}

      {confirmation !== null && (
        <ImportConfirmDialog
          updated={confirmation.updated}
          busy={busy === "import"}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void runImport(confirmation.document)}
        />
      )}
    </section>
  );
}
