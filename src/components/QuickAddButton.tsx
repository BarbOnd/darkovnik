import { paths } from "../app/routes";
import { Link } from "./Link";
import { PlusIcon } from "./icons";

/** Prominent floating "+" opening quick add, optionally with a preselected recipient. */
export function QuickAddButton({ personId }: { personId?: number }) {
  return (
    <Link className="fab" href={paths.quickAdd(personId)} aria-label="Rychle přidat dárek" title="Přidat dárek">
      <PlusIcon />
    </Link>
  );
}
