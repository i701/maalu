import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { GRADIENT, type Gradient } from "#/lib/m3";

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
 * A headline figure on a deep gradient, with a translucent shaped icon. The shape turns and the
 * card lifts a little on hover. White text on dark gradients reads in both colour modes.
 */
export default function StatCard({
	label,
	value,
	gradient = "teal",
	tone,
	icon,
	shape = 0,
}: {
	label: string;
	value: string;
	gradient?: Gradient;
	/** A solid tonal container instead of a gradient (overrides `gradient`). */
	tone?: keyof typeof TONAL;
	/** Material Symbols ligature name */
	icon: string;
	shape?: number;
}) {
	const [from, to] = GRADIENT[gradient];
	const fg = tone ? TONAL[tone].fg : "#fff";
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 2,
				p: 2.5,
				height: "100%",
				color: fg,
				borderRadius: "var(--shape-xl)",
				background: tone ? TONAL[tone].bg : `linear-gradient(135deg, ${from}, ${to})`,
				transition: "transform var(--spring-spatial-default-dur) var(--spring-spatial-default)",
				"&:active": { transform: "scale(.97)" }, // the site's .press
				"@media (hover: hover) and (pointer: fine)": {
					"&:hover": { transform: "translateY(-2px)" },
					"&:hover .shape-bg": { transform: "rotate(30deg) scale(1.06)" },
					"&:hover .sym": { fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24' },
				},
				"@media (prefers-reduced-motion: reduce)": { "&:hover": { transform: "none" } },
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
				bg={tone ? `color-mix(in srgb, ${fg} 14%, transparent)` : "rgb(255 255 255 / 0.16)"}
				fg={fg}
			>
				<Symbol name={icon} size={26} />
			</ShapeTile>
		</Box>
	);
}
