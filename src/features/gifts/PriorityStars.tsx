import { StarIcon } from "../../components/icons";
import type { GiftPriority } from "../../domain/entities";
import { PRIORITY_LABELS, PRIORITY_STARS } from "./labels";

/** 1–3 filled stars out of 3, announced as "Priorita: vysoká". */
export function PriorityStars({ priority }: { priority: GiftPriority }) {
  const filled = PRIORITY_STARS[priority];
  return (
    <span
      className="priority-stars"
      role="img"
      aria-label={`Priorita: ${PRIORITY_LABELS[priority].toLocaleLowerCase("cs-CZ")}`}
    >
      {[1, 2, 3].map((star) => (
        <StarIcon key={star} className="priority-stars__star" filled={star <= filled} />
      ))}
    </span>
  );
}
