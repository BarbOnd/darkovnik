import { Avatar, Style } from "@dicebear/core";
import initialFace from "@dicebear/styles/initial-face.json";

const SEED_BYTES = 16;

/**
 * Creates an opaque random avatar seed. It never contains personal data
 * (CLAUDE.md → Avatar), so it is independent of the person's name or birthday.
 */
export function createAvatarSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SEED_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** First letter of the display name, upper-cased; "?" when the name has no letter. */
export function avatarInitial(name: string): string {
  const letter = /\p{L}\p{M}*/u.exec(name)?.[0];
  return letter === undefined ? "?" : letter.toLocaleUpperCase("cs-CZ");
}

function isInitialVariable(node: unknown): boolean {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as { type?: unknown }).type === "variable" &&
    (node as { name?: unknown }).name === "initial"
  );
}

/**
 * Initial Face derives its letter from the seed. Our seed is random, so the
 * letter is replaced by the initial of the current display name instead
 * (PRODUCT.md §16); colors and face still come from the seed only.
 */
function withInitial(node: unknown, initial: string): unknown {
  if (isInitialVariable(node)) return initial;
  if (Array.isArray(node)) return node.map((child) => withInitial(child, initial));
  if (typeof node === "object" && node !== null) {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, withInitial(value, initial)]),
    );
  }
  return node;
}

const stylesByInitial = new Map<string, Style>();

function styleFor(initial: string): Style {
  let style = stylesByInitial.get(initial);
  if (style === undefined) {
    style = new Style(withInitial(initialFace, initial));
    stylesByInitial.set(initial, style);
  }
  return style;
}

/** Renders the avatar locally as a `data:image/svg+xml` URI. */
export function avatarDataUri(seed: string, name: string): string {
  return new Avatar(styleFor(avatarInitial(name)), {
    seed,
    animationVariant: "none",
  }).toDataUri();
}
