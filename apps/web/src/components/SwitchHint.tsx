import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/**
 * The line of help under a labelled switch. It sits 4px below the switch (the gap M3 gives a text
 * field's supporting text) and lines up under the label, 64px in: the 52px switch and the 12px
 * the theme puts before its label. Use it after every `FormSwitch` or `FormControlLabel` with a
 * switch, so the spacing is the same everywhere.
 */
export default function SwitchHint({
	children,
	error = false,
}: {
	children: ReactNode;
	/** Colours the line as an error */
	error?: boolean;
}) {
	return (
		<Typography
			variant="caption"
			component="p"
			sx={{ color: error ? "error.main" : "text.secondary", mt: 0.5, ml: "64px" }}
		>
			{children}
		</Typography>
	);
}
