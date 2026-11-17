/** `font-variation-settings` for Material Symbols: outlined (FILL 0) and filled (FILL 1). */
export const SYMBOL_OUTLINED = '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24';
export const SYMBOL_FILLED = '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24';

/** A check mark as a CSS mask (Material's `check` path): paint it with `currentColor` and a
 * width that springs from 0 to open a selected segment or chip. No icon font needed. */
export const CHECK_MASK = {
	content: '""',
	flexShrink: 0,
	height: 18,
	backgroundColor: "currentColor",
	maskImage:
		"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E\")",
	maskRepeat: "no-repeat",
	maskPosition: "center",
	maskSize: "contain",
} as const;
