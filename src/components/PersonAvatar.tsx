import { useMemo } from "react";
import { avatarDataUri } from "../lib/avatar";

type PersonAvatarProps = {
  seed: string;
  name: string;
  size?: number;
  /** Accessible name; omit for decorative avatars next to a visible name. */
  label?: string;
};

export function PersonAvatar({ seed, name, size = 44, label }: PersonAvatarProps) {
  const src = useMemo(() => avatarDataUri(seed, name), [seed, name]);
  return (
    <img
      className="avatar"
      src={src}
      width={size}
      height={size}
      alt={label ?? ""}
      draggable={false}
    />
  );
}
