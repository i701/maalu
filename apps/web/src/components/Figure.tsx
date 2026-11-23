import Box from "@mui/material/Box";
import { useEffect, useRef } from "react";
import { splitCurrency } from "#/lib/format";

/** Hidden from the eye but read aloud (the characters beside it are `aria-hidden`). */
const VISUALLY_HIDDEN = {
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
} as const;

/** The face for big numbers (the theme's text face too, since 2026-11-19; kept as its own name so
 * the two can be told apart again). */
export const FIGURE_FONT = '"Sora", "Sora Fallback", system-ui, sans-serif';

/**
 * A headline figure: the number large, in Sora, tightly tracked and with even-width digits, the
 * currency in front of it small and muted, so the eye lands on the number. The size comes from the
 * text around it, and the weight from `--figure-weight` (400 unless a parent sets it).
 *
 * When the number changes, each character that changed fades in out of a blur (a character is keyed
 * by its place counted from the end, so the digits that stay put are not touched). The first
 * showing does not animate: `data-live` is set after mount, and the CSS only animates under it.
 * shortcut: the old characters vanish at once instead of fading out, upgrade if that reads badly.
 */
export default function Figure({ children }: { children: string }) {
	const { currency, number } = splitCurrency(children);
	const root = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (root.current) root.current.dataset.live = "true";
	}, []);
	const characters = number.split(""); // digits, separators and a minus: no emoji
	return (
		<Box
			component="span"
			ref={root}
			sx={{
				fontFamily: FIGURE_FONT,
				fontWeight: "var(--figure-weight, 400)",
				letterSpacing: "-0.03em",
				fontVariantNumeric: "tabular-nums",
				textRendering: "optimizeLegibility",
				"&[data-live] .figure-char": {
					animation:
						"figure-blur-in var(--spring-effects-default-dur) var(--spring-effects-default) backwards",
				},
				"@media (prefers-reduced-motion: reduce)": {
					"&[data-live] .figure-char": { animation: "none" },
				},
			}}
		>
			{currency && (
				<Box
					component="span"
					sx={{
						// smaller than the number, on the same baseline
						fontSize: "max(0.62em, 12px)",
						fontWeight: 500,
						letterSpacing: "0.02em",
						mr: "0.3em",
						// the figure's own colour, a step quieter
						color: "inherit",
						opacity: 0.72,
					}}
				>
					{currency}
				</Box>
			)}
			<Box component="span" sx={VISUALLY_HIDDEN}>
				{number}
			</Box>
			<span aria-hidden>
				{characters.map((character, index) => (
					<Box
						component="span"
						className="figure-char"
						key={`${characters.length - index}:${character}`}
						sx={{ display: "inline-block", whiteSpace: "pre" }}
					>
						{character}
					</Box>
				))}
			</span>
		</Box>
	);
}
