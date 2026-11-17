import { ACCENT, isAccent } from "#/lib/m3";

/** A tag's colour is one of the accent names, picked by the API; anything else reads as grey. */
export const tagAccent = (color: string): string =>
	isAccent(color) ? ACCENT[color] : ACCENT.slate;
