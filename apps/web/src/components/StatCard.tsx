import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { type Tint, tintFill, tintInk } from "#/lib/m3";
import { useCardMorph } from "#/lib/card-morph";
import { MORPH_TRANSITION, morphUp } from "#/lib/shape";

/** Solid tonal containers (adapt to light and dark), like the site's cyan and lavender tiles. */
const TONAL = {
	primary: {
		bg: "var(--md-sys-color-primary-container)",
		fg: "var(--md-sys-color-on-primary-container)",
	},
	tertiary: {
		bg: "var(--md-sys-color-tertiary-container)",
		fg: "var(--md-sys-color-on-tertiary-container)",
	},
} as const;
import ShapeTile from "./ShapeTile";
import Symbol from "./Symbol";

/**
 * A headline figure on a pastel tile, with its icon in a small white shape. The shape turns on
 * hover.
 */
export default function StatCard({
	label,
	value,
	tint = "blue",
	tone,
	icon,
	shape = 0,
	reverse,
}: {
	label: string;
	value: string;
	tint?: Tint;
	/** A solid tonal container instead of the tint (overrides `tint`). */
	tone?: keyof typeof TONAL;
	/** Material Symbols ligature name */
	icon: string;
	shape?: number;
	/** Squarer at rest, rounding up under the pointer. Left out, it follows the page (`CardMorph`). */
	reverse?: boolean;
}) {
	const pageMorph = useCardMorph();
	const fg = tone ? TONAL[tone].fg : "var(--md-sys-color-on-surface)";
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 2,
				p: 2.5,
				height: "100%",
				color: fg,
				...(reverse === undefined ? pageMorph : reverse ? morphUp("xl") : pageMorph),
				background: tone ? TONAL[tone].bg : tintFill(tint),
				transition: `${MORPH_TRANSITION}, transform var(--spring-spatial-default-dur) var(--spring-spatial-default)`,
				"&:active": { transform: "scale(.97)" }, // the site's .press
				"@media (hover: hover) and (pointer: fine)": {
					"&:hover .shape-bg": { transform: "rotate(30deg) scale(1.06)" },
					"&:hover .sym": { fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24' },
				},
			}}
		>
			<Box sx={{ minWidth: 0, flexGrow: 1 }}>
				<Typography variant="body2" sx={{ color: "inherit", opacity: 0.82 }}>
					{label}
				</Typography>
				<Typography variant="h2" component="p" sx={{ mt: 0.5, color: "inherit" }} noWrap>
					{value}
				</Typography>
			</Box>
			<ShapeTile
				shape={shape}
				size={52}
				bg={
					tone
						? `color-mix(in srgb, ${fg} 14%, transparent)`
						: "var(--md-sys-color-surface-container-low)"
				}
				fg={tone ? fg : tintInk(tint)}
			>
				<Symbol name={icon} size={26} />
			</ShapeTile>
		</Box>
	);
}
