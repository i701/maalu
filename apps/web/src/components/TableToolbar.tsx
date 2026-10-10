import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import RefreshButton from "./RefreshButton";

/** Row above a table: filters on the left, the result count and a refresh button on the right.
 * Stacks vertically on narrow screens. */
export default function TableToolbar({
	filters,
	summary,
	actions,
}: {
	filters?: ReactNode;
	/** Extra buttons next to refresh, e.g. Export. */
	actions?: ReactNode;
	/** e.g. "12 vendors" */
	summary: ReactNode;
}) {
	return (
		<Stack
			direction={{ xs: "column", sm: "row" }}
			spacing={{ xs: 1.5, sm: 2 }}
			sx={{ p: 2, alignItems: { xs: "stretch", sm: "center" } }}
		>
			{filters && (
				<Stack
					direction={{ xs: "column", sm: "row" }}
					spacing={{ xs: 1.5, sm: 2 }}
					useFlexGap
					sx={{ flexWrap: "wrap", alignItems: { xs: "stretch", sm: "center" } }}
				>
					{filters}
				</Stack>
			)}
			<Box sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }} />
			<Stack
				direction="row"
				sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flexShrink: 0 }}
			>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{summary}
				</Typography>
				{actions}
				<RefreshButton />
			</Stack>
		</Stack>
	);
}
