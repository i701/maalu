import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";

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
					sx={(t) => ({
						bgcolor: alpha(t.palette[f.tone].main, 0.1),
						color: t.palette[f.tone].dark,
						"& .MuiChip-deleteIcon": {
							color: "inherit",
							opacity: 0.6,
							"&:hover": { color: "inherit", opacity: 1 },
						},
						"&.Mui-focusVisible": { bgcolor: alpha(t.palette[f.tone].main, 0.2) },
					})}
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
