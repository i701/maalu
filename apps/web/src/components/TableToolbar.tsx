import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useViewMode } from "#/lib/view-mode";
import RefreshButton from "./RefreshButton";
import ViewToggle from "./ViewToggle";

/**
 * Row above a table: the search and filters on the left, the result count, view toggle and actions
 * on the right, all centred on one line. The left side grows and keeps its pieces together (a
 * search box and its Filters button never split up). When the right side doesn't fit beside it,
 * the whole right side moves to its own line, count on the left and buttons on the right, so
 * nothing is ever pushed off the edge.
 */
export default function TableToolbar({
	filters,
	chips,
	summary,
	actions,
	viewToggle = true,
}: {
	filters?: ReactNode;
	/** Rows of filter chips under the search line (see ChipFilter). */
	chips?: ReactNode;
	/** Extra buttons next to refresh, e.g. Export. */
	actions?: ReactNode;
	/** e.g. "12 vendors" */
	summary: ReactNode;
	/** Show the Cards / Table toggle (lists that have both views). */
	viewToggle?: boolean;
}) {
	const cards = useViewMode() === "cards";
	return (
		<>
			<Box
				sx={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					columnGap: 2,
					rowGap: 1.5,
					px: cards ? 0 : 2,
					py: 2,
				}}
			>
				{filters && (
					<Box
						sx={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "center",
							gap: 1.5,
							// Its natural width decides the line break: when the filters and the right side
							// don't both fit, the right side drops to its own line rather than the filters
							// splitting up. It then grows into the space left over.
							flex: "1 1 auto",
							minWidth: 0,
						}}
					>
						{filters}
					</Box>
				)}
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: { xs: "space-between", sm: "flex-end" },
						gap: 1,
						ml: "auto",
						// a line of its own on a phone; beside the filters when there is room
						flex: { xs: "1 1 100%", sm: "0 0 auto" },
					}}
				>
					<Typography
						variant="body2"
						sx={{ color: "text.secondary", whiteSpace: "nowrap", mr: { sm: 1 } }}
					>
						{summary}
					</Typography>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						{viewToggle && <ViewToggle />}
						{actions}
						<RefreshButton />
					</Box>
				</Box>
			</Box>
			{chips && (
				<Stack spacing={1} sx={{ px: cards ? 0 : 2, pb: 2 }}>
					{chips}
				</Stack>
			)}
		</>
	);
}
