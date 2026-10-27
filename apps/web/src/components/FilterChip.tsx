import Chip from "@mui/material/Chip";
import Symbol from "./Symbol";

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
			sx={{
				height: 32,
				borderRadius: selected ? "var(--shape-lg)" : "var(--shape-sm)",
				fontSize: 13,
				fontWeight: 500,
				bgcolor: selected
					? accent
						? `color-mix(in oklab, ${accent} 24%, var(--md-sys-color-surface-container-low))`
						: "var(--md-sys-color-secondary-container)"
					: "transparent",
				color: selected
					? accent
						? `color-mix(in oklab, ${accent} 45%, var(--md-sys-color-on-surface))`
						: "var(--md-sys-color-on-secondary-container)"
					: "var(--md-sys-color-on-surface-variant)",
				boxShadow: selected ? "none" : "inset 0 0 0 1px var(--md-sys-color-outline-variant)",
				transition:
					"background-color var(--spring-effects-default-dur) var(--spring-effects-default), border-radius var(--spring-spatial-fast-dur) var(--spring-spatial-fast), box-shadow var(--spring-effects-default-dur) var(--spring-effects-default)",
				// M3 state layers: hover 8%, keyboard focus 10% (the focus ring is added globally)
				"&:hover": {
					bgcolor: selected
						? undefined
						: "color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)",
				},
				"&:focus-visible": {
					bgcolor: selected
						? undefined
						: "color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent)",
				},
				// 10px before the icon, 6px between icon and text, 12px after: the same on every chip
				"& .MuiChip-label": { pl: symbol ? 0.75 : 1.5, pr: 1.5 },
			}}
		/>
	);
}
