import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import { SYMBOL_FILLED, SYMBOL_OUTLINED } from "#/lib/symbols";

/**
 * A Material Symbols Rounded icon by ligature name ("receipt_long"). Its fill animates on the
 * effects spring: pass `filled`, or let a parent fill it on hover or selection with
 * `"&:hover .sym": { fontVariationSettings: SYMBOL_FILLED }`.
 *
 * The bundled font is a subset (about 150KB), not every Material Symbol. An
 * unknown name renders as its first letters, so check a new icon at fonts.google.com/icons and
 * look at it in the app. To use any icon, swap in the full font (@fontsource-variable/
 * material-symbols-rounded, about 1.4MB) or generate a subset for the names we use.
 */
export default function Symbol({
	name,
	size = 24,
	filled = false,
	sx,
}: {
	name: string;
	size?: number;
	filled?: boolean;
	sx?: SxProps<Theme>;
}) {
	return (
		<Box
			component="span"
			aria-hidden
			className="sym"
			sx={[
				{
					fontFamily: '"Material Symbols Rounded"',
					fontSize: size,
					fontStyle: "normal",
					fontWeight: 400,
					lineHeight: 1,
					width: "1em",
					display: "inline-block",
					overflow: "hidden",
					whiteSpace: "nowrap",
					letterSpacing: "normal",
					fontFeatureSettings: '"liga"',
					userSelect: "none",
					flexShrink: 0,
					fontVariationSettings: filled ? SYMBOL_FILLED : SYMBOL_OUTLINED,
					transition:
						"font-variation-settings var(--spring-effects-default-dur) var(--spring-effects-default)",
				},
				...(Array.isArray(sx) ? sx : [sx]),
			]}
		>
			{name}
		</Box>
	);
}
