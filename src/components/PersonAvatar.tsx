import { useMemo } from "react";
import { avatarDataUri } from "../lib/avatar";

type PersonAvatarProps = {
  seed: string;
  name: string;
  /** When set, the photo is shown instead of the generated avatar. */
  photo?: string | null;
  size?: number;
  /** Accessible name; omit for decorative avatars next to a visible name. */
  label?: string;
};

export function PersonAvatar({ seed, name, photo = null, size = 44, label }: PersonAvatarProps) {
  const generated = useMemo(
    () => (photo === null ? avatarDataUri(seed, name) : null),
    [photo, seed, name],
  );
  return (
    <img
      className={photo === null ? "avatar" : "avatar avatar--photo"}
      src={photo ?? generated ?? ""}
      width={size}
      height={size}
      alt={label ?? ""}
      draggable={false}
    />
  );
}
