import Box from "@mui/material/Box";
import FormLabel from "@mui/material/FormLabel";
import { ACCENT_NAMES, categoryAccent } from "#/lib/categories";

/** A row of colour choices, as a radio group. */
export default function ColorSwatches({
	value,
	onChange,
	label = "Colour",
}: {
	value: string;
	onChange: (color: string) => void;
	label?: string;
}) {
	return (
		<Box role="radiogroup" aria-label={label}>
			<FormLabel sx={{ display: "block", mb: 1, fontSize: 12 }}>{label}</FormLabel>
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
				{ACCENT_NAMES.map((name) => (
					<Box
						key={name}
						component="button"
						type="button"
						role="radio"
						aria-checked={value === name}
						aria-label={name}
						title={name}
						onClick={() => onChange(name)}
						sx={{
							width: 28,
							height: 28,
							p: 0,
							cursor: "pointer",
							border: 0,
							borderRadius: "50%",
							bgcolor: categoryAccent(name),
							outline: value === name ? "2px solid var(--md-sys-color-on-surface)" : "none",
							outlineOffset: 2,
						}}
					/>
				))}
			</Box>
		</Box>
	);
}
