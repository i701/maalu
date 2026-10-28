import { ACCENT, type Accent } from "#/lib/m3";

/** A tag's colour is one of the accent names, picked by the API; anything else reads as grey. */
export const tagAccent = (color: string): string => ACCENT[color as Accent] ?? ACCENT.slate;
