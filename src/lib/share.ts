/**
 * Browsers let a page share only common file types (images, text, PDF…), not
 * `.json`. The backup is therefore shared as a plain-text file with the same
 * JSON content; import accepts it (DATABASE.md → Backup schema).
 */
const SHARE_FILE_TYPE = "text/plain";

function backupFile(fileName: string, content: string): File {
  return new File([content], fileName, { type: SHARE_FILE_TYPE });
}

/** Whether this browser can hand a backup file to other apps (Web Share API with files). */
export function canShareBackup(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") {
    return false;
  }
  try {
    return navigator.canShare({ files: [backupFile("darkovnik-zaloha.txt", "{}")] });
  } catch {
    return false;
  }
}

/** Opens the system share sheet with the backup. Resolves false when the user cancelled. */
export async function shareBackup(fileName: string, data: unknown): Promise<boolean> {
  const file = backupFile(fileName, JSON.stringify(data, null, 2));
  try {
    await navigator.share({ files: [file], title: "Záloha Dárkovníku" });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return false;
    throw error;
  }
}
