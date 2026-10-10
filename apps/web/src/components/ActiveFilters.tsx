import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";

type Tone = "primary" | "secondary" | "success" | "warning" | "info" | "error";

export type ActiveFilter = { key: string; label: string; tone: Tone; onDelete: () => void };

/** Removable chips for the filters that are on, so they're visible without opening the drawer. */
export default function ActiveFilters({
	filters,
	onClear,
	sx,
}: {
	filters: ActiveFilter[];
	onClear: () => void;
	sx?: object;
}) {
	if (filters.length === 0) return null;
	return (
		<Box
			role="list"
			aria-label="Active filters"
			sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, px: 2, pb: 2, ...sx }}
		>
			{filters.map((f) => (
				<Chip
					key={f.key}
					role="listitem"
					size="small"
					label={f.label}
					onDelete={f.onDelete}
					sx={(t) => {
						const main = `var(--mui-palette-${f.tone}-main)`;
						return {
							// CSS variables, not t.palette (always the light scheme), so dark mode tints correctly
							bgcolor: `color-mix(in srgb, ${main} 10%, transparent)`,
							color: `${f.tone}.dark`,
							...t.applyStyles("dark", { color: `${f.tone}.light` }),
							"& .MuiChip-deleteIcon": {
								color: "inherit",
								opacity: 0.6,
								"&:hover": { color: "inherit", opacity: 1 },
							},
							"&.Mui-focusVisible": { bgcolor: `color-mix(in srgb, ${main} 20%, transparent)` },
						};
					}}
				/>
			))}
			{filters.length > 1 && (
				<Button size="small" color="inherit" onClick={onClear}>
					Clear all
				</Button>
			)}
		</Box>
	);
}
