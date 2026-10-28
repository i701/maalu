import { morph } from "#/lib/shape";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { describeLine, linesNeedingAttention, STATUS_COLOR } from "#/lib/budget";
import type { Budget } from "#/types/api";
import { RouterButton } from "./RouterLinks";
import Symbol from "./Symbol";

const SHOWN = 2;

/** A strip for the top of a page: which budget limits are close or over right now, with a link to
 * the budget. Renders nothing while everything is on track (or there is no budget). */
export default function BudgetAlert({ budget }: { budget: Budget | null }) {
	if (!budget || !budget.period.is_current) return null;
	const lines = linesNeedingAttention(budget);
	if (lines.length === 0) return null;
	const color = STATUS_COLOR[lines[0].status];

	return (
		<Box
			role="status"
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 1.5,
				mb: 2,
				px: 2,
				py: 1.25,
				...morph("lg"),
				bgcolor: `color-mix(in oklab, ${color} 16%, var(--md-sys-color-surface-container-low))`,
			}}
		>
			<Symbol name="warning" size={22} filled sx={{ color, flexShrink: 0 }} />
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Typography variant="body2" sx={{ fontWeight: 500 }}>
					{lines
						.slice(0, SHOWN)
						.map((l) => describeLine(l, budget.currency))
						.join(" · ")}
					{lines.length > SHOWN && ` · and ${lines.length - SHOWN} more`}
				</Typography>
			</Box>
			<RouterButton
				to="/budget"
				search={{ on: undefined }}
				color="inherit"
				size="small"
				sx={{ flexShrink: 0 }}
			>
				View budget
			</RouterButton>
		</Box>
	);
}
