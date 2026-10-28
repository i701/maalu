import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import Reveal from "./Reveal";

/** Appears above a list while rows are selected: how many, the actions for them, and a way out. */
export default function SelectionBar({
	count,
	onClear,
	children,
}: {
	count: number;
	onClear: () => void;
	/** The actions, as buttons. */
	children: ReactNode;
}) {
	return (
		<Reveal in={count > 0}>
			<Stack
				direction="row"
				role="toolbar"
				aria-label="Actions for the selected rows"
				sx={{
					alignItems: "center",
					flexWrap: "wrap",
					gap: 1,
					mx: 1.5,
					mb: 1.5,
					px: 2,
					py: 1,
					borderRadius: "var(--shape-lg)",
					bgcolor: "var(--md-sys-color-secondary-container)",
					color: "var(--md-sys-color-on-secondary-container)",
				}}
			>
				<Typography variant="body2" sx={{ fontWeight: 600, mr: "auto" }} aria-live="polite">
					{count} selected
				</Typography>
				{children}
				<Button color="inherit" size="small" onClick={onClear}>
					Clear
				</Button>
			</Stack>
		</Reveal>
	);
}
