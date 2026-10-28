import Chip from "@mui/material/Chip";
import Symbol from "./Symbol";

const SPRING_SHAPE = "border-radius var(--spring-spatial-fast-dur) var(--spring-spatial-fast)";
const SPRING_COLOUR = "var(--spring-effects-default-dur) var(--spring-effects-default)";

/** The chip's colours for its state: the selected tint (the accent's, or the secondary container),
 * or transparent with muted text. */
function chipColours(selected: boolean, accent?: string) {
	if (!selected) {
		return { bg: "transparent", fg: "var(--md-sys-color-on-surface-variant)" };
	}
	if (!accent) {
		return {
			bg: "var(--md-sys-color-secondary-container)",
			fg: "var(--md-sys-color-on-secondary-container)",
		};
	}
	return {
		bg: `color-mix(in oklab, ${accent} 24%, var(--md-sys-color-surface-container-low))`,
		fg: `color-mix(in oklab, ${accent} 45%, var(--md-sys-color-on-surface))`,
	};
}

/** Corner at rest and one step less rounded under the pointer or focus (the shape morph, see
 * lib/shape.ts): a selected chip rests at 16px and goes to 12px, an unselected one 8px to 4px. */
function chipSx(selected: boolean, accent: string | undefined, hasIcon: boolean) {
	const { bg, fg } = chipColours(selected, accent);
	const rest = selected ? "var(--shape-lg)" : "var(--shape-sm)";
	const active = selected ? "var(--shape-md)" : "var(--shape-xs)";
	return {
		height: 32,
		borderRadius: rest,
		fontSize: 13,
		fontWeight: 500,
		bgcolor: bg,
		color: fg,
		boxShadow: selected ? "none" : "inset 0 0 0 1px var(--md-sys-color-outline-variant)",
		transition: `background-color ${SPRING_COLOUR}, ${SPRING_SHAPE}, box-shadow ${SPRING_COLOUR}`,
		// M3 state layers: hover 8%, keyboard focus 10% (the focus ring is added globally)
		"&:hover": {
			borderRadius: active,
			bgcolor: selected
				? undefined
				: "color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)",
		},
		"&:focus-visible": {
			borderRadius: active,
			bgcolor: selected
				? undefined
				: "color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent)",
		},
		// 10px before the icon, 6px between icon and text, 12px after: the same on every chip
		"& .MuiChip-label": { pl: hasIcon ? 0.75 : 1.5, pr: 1.5 },
	} as const;
}

/**
 * A single-choice filter chip, after the demo: 8px corners and a hairline ring at rest; when
 * selected it springs to 16px corners, fills with a tint (the accent's, or the secondary
 * container) and its icon fills in.
 */
export default function FilterChip({
	label,
	selected,
	onClick,
	symbol,
	accent,
}: {
	label: string;
	selected: boolean;
	onClick: () => void;
	/** Material Symbols name (must exist in the bundled font subset) */
	symbol?: string;
	/** CSS colour that tints the icon, and the chip when selected */
	accent?: string;
}) {
	return (
		<Chip
			label={label}
			onClick={onClick}
			aria-pressed={selected}
			icon={
				symbol ? (
					<Symbol
						name={symbol}
						size={18}
						filled={selected}
						// Spaced here, not via .MuiChip-icon: Symbol doesn't forward MUI's class, so the
						// icon would sit flush against the chip's left edge.
						sx={{
							ml: 1.25,
							color: accent
								? `color-mix(in oklab, ${accent} 80%, var(--md-sys-color-on-surface))`
								: "inherit",
						}}
					/>
				) : undefined
			}
			sx={chipSx(selected, accent, Boolean(symbol))}
		/>
	);
}
