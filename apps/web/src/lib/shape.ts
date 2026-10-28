/**
 * The shape morph, one rule for the whole app (Material 3 Expressive): a surface that can be
 * hovered or focused rests at one corner size and springs to the next, less rounded one while the
 * pointer is over it or focus is on or inside it. Cards, pills, chips and navigation items all use
 * this, so the app moves the same way everywhere. Use `morph` for any new one instead of setting a
 * radius by hand.
 *
 *     sx={{ ...morph("xl"), p: 2 }}                     // a card: 28px -> 16px
 *     sx={{ ...morph("xl", "md") }}                     // a pill: 28px -> 12px
 *
 * If the element sets its own `transition`, start it with MORPH_TRANSITION so the corners still
 * spring.
 */

type Step = "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "full";

/** One step less rounded than each token. A fully round shape drops to the medium corner. */
const LESS: Record<Step, Step> = {
	xs: "xs",
	sm: "xs",
	md: "sm",
	lg: "md",
	xl: "lg",
	xxl: "xl",
	full: "md",
};

const css = (shape: string) => (shape in LESS ? `var(--shape-${shape})` : shape);

/** The spring the corners move on. */
export const MORPH_TRANSITION =
	"border-radius var(--spring-spatial-fast-dur) var(--spring-spatial-fast)";

/**
 * `rest` is a shape token ("xl") or any CSS radius ("24px"); `active` defaults to the next less
 * rounded token and can be given to choose a bigger step. A pill taller than its corner token
 * should rest at half its height (or `xl`) rather than `full`, so the spring starts moving at once.
 */
export function morph(rest: Step | (string & {}), active?: Step | (string & {})) {
	const to = css(active ?? (rest in LESS ? LESS[rest as Step] : "var(--shape-md)"));
	return {
		borderRadius: css(rest),
		transition: MORPH_TRANSITION,
		// The conditions are written in the opposite order to the usual "(hover: hover) and
		// (pointer: fine)": an element that spreads this and then writes its own hover block would
		// otherwise replace this key by having the same name.
		"@media (pointer: fine) and (hover: hover)": { "&:hover": { borderRadius: to } },
		"&:focus-visible, &:focus-within": { borderRadius: to },
		// No springing shapes for people who ask for less motion.
		"@media (prefers-reduced-motion: reduce)": { transition: "none" },
	} as const;
}
