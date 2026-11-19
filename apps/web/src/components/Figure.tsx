import Box from "@mui/material/Box";
import { splitCurrency } from "#/lib/format";

/** The face for big numbers (the theme's text face too, since 2026-11-19; kept as its own name so
 * the two can be told apart again). */
export const FIGURE_FONT = '"Sora", "Sora Fallback", system-ui, sans-serif';

/**
 * A headline figure: the number large, in Sora, tightly tracked and with even-width digits, the
 * currency in front of it small and muted, so the eye lands on the number. The size comes from the
 * text around it, and the weight from `--figure-weight` (400 unless a parent sets it).
 */
export default function Figure({ children }: { children: string }) {
	const { currency, number } = splitCurrency(children);
	return (
		<Box
			component="span"
			sx={{
				fontFamily: FIGURE_FONT,
				fontWeight: "var(--figure-weight, 400)",
				letterSpacing: "-0.03em",
				fontVariantNumeric: "tabular-nums",
				textRendering: "optimizeLegibility",
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
			{number}
		</Box>
	);
}
