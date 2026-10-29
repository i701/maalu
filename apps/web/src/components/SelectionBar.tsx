import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import Reveal from "./Reveal";

/** Appears above a list while rows are selected: how many, the actions for them, and a way out. */
export default function SelectionBar({
	count,
	onClear,
	extra,
	children,
}: {
	count: number;
	onClear: () => void;
	/** Beside the count, for example an offer to select more. */
	extra?: ReactNode;
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
				<Stack
					direction="row"
					sx={{ alignItems: "center", flexWrap: "wrap", columnGap: 1.5, mr: "auto" }}
				>
					<Typography variant="body2" sx={{ fontWeight: 600 }} aria-live="polite">
						{count.toLocaleString("en-GB")} selected
					</Typography>
					{extra}
				</Stack>
				{children}
				<Button color="inherit" size="small" onClick={onClear}>
					Clear
				</Button>
			</Stack>
		</Reveal>
	);
}
