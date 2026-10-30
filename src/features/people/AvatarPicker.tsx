import { useState } from "react";
import { PersonAvatar } from "../../components/PersonAvatar";
import { createAvatarSeed } from "../../lib/avatar";

const VARIANT_COUNT = 9;

function newSeeds(): string[] {
  return Array.from({ length: VARIANT_COUNT }, () => createAvatarSeed());
}

type AvatarPickerProps = {
  /** Display name; only its initial is shown in the avatar, it never becomes part of the seed. */
  name: string;
  onSelect(seed: string): void;
  disabled?: boolean;
};

/** Grid of variants generated from new random seeds, plus "Další varianty". */
export function AvatarPicker({ name, onSelect, disabled = false }: AvatarPickerProps) {
  const [seeds, setSeeds] = useState(newSeeds);

  return (
    <div className="avatar-picker">
      <ul className="avatar-picker__grid">
        {seeds.map((seed, index) => (
          <li key={seed}>
            <button
              type="button"
              className="avatar-picker__option"
              aria-label={`Vybrat variantu ${index + 1}`}
              disabled={disabled}
              onClick={() => onSelect(seed)}
            >
              <PersonAvatar seed={seed} name={name} size={72} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="button button--secondary button--block"
        disabled={disabled}
        onClick={() => setSeeds(newSeeds())}
      >
        Další varianty
      </button>
    </div>
  );
}
