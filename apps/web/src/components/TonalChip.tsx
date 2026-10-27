import Chip, { type ChipProps } from "@mui/material/Chip";

/**
 * A small tag tinted with an accent colour (the demo's `.tag`: 22px, 11px text, 8px corners): a soft fill of the colour over the surface and text
 * in a deeper mix of it. Quieter than MUI's saturated colour chips, and it works in light and dark.
 */
export default function TonalChip({
	accent,
	sx,
	...props
}: Omit<ChipProps, "color" | "variant"> & { accent: string }) {
	return (
		<Chip
			size="small"
			{...props}
			sx={[
				{
					height: 22,
					fontSize: 11,
					fontWeight: 500,
					borderRadius: "var(--shape-sm)",
					bgcolor: `color-mix(in oklab, ${accent} 20%, var(--md-sys-color-surface-container-low))`,
					color: `color-mix(in oklab, ${accent} 70%, var(--md-sys-color-on-surface))`,
					"& .MuiChip-icon": { color: "inherit" },
				},
				...(Array.isArray(sx) ? sx : [sx]),
			]}
		/>
	);
}
