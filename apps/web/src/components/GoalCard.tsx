import { morph } from "#/lib/shape";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { formatDate, formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import type { Goal } from "#/types/api";
import TonalChip from "./TonalChip";

/** The progress track for a goal, in the goal's colour (green once reached). */
function Bar({ percent, color }: { percent: number; color: string }) {
	const width = Math.min(percent, 100);
	return (
		<Box
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={width}
			sx={{
				mt: 1.5,
				height: 10,
				borderRadius: "var(--shape-full)",
				bgcolor: "var(--md-sys-color-surface-container-highest)",
				overflow: "hidden",
			}}
		>
			<Box
				sx={{
					height: "100%",
					width: `${width}%`,
					minWidth: width > 0 ? 10 : 0,
					borderRadius: "var(--shape-full)",
					bgcolor: color,
					transition: "width var(--spring-spatial-default-dur) var(--spring-spatial-default)",
				}}
			/>
		</Box>
	);
}

/** What the plan needs, in words: "Needs MVR 2,250 a month for 4 more months", or that it is done. */
function planLine(goal: Goal) {
	if (goal.reached) return "Goal reached";
	if (goal.target_date == null) return null;
	if (goal.months_left === 0) return `Target date ${formatDate(goal.target_date)} has passed`;
	const months = goal.months_left ?? 0;
	return `Needs ${formatMoney(goal.needed_per_month ?? "0", goal.currency)} a month for ${months} more ${months === 1 ? "month" : "months"}`;
}

/** One savings goal: how much is saved toward the target, what it needs each month, and, with a
 * monthly plan, whether this period's amount has been set aside. Memoised like the other cards. */
const GoalCard = memo(function GoalCard({
	goal,
	onAddMoney,
	onEdit,
	onDelete,
}: {
	goal: Goal;
	onAddMoney: (goal: Goal) => void;
	onEdit: (goal: Goal) => void;
	onDelete: (goal: Goal) => void;
}) {
	const color = goal.reached ? ACCENT.green : ACCENT.blue;
	const plan = planLine(goal);

	return (
		<Box
			sx={{
				p: 2.5,
				...morph("xl"),
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Box
				sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}
			>
				<Box sx={{ minWidth: 0 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
						{goal.name}
					</Typography>
					<Box sx={{ mt: 0.5 }}>
						<TonalChip
							accent="var(--md-sys-color-outline)"
							label={goal.account ? `Follows ${goal.account.name}` : "Set aside by hand"}
						/>
					</Box>
				</Box>
				<Box sx={{ display: "flex", flexShrink: 0, mr: -0.75, mt: -0.5 }}>
					<IconButton aria-label="Edit" title="Edit" size="small" onClick={() => onEdit(goal)}>
						<EditOutlinedIcon fontSize="small" />
					</IconButton>
					<IconButton
						aria-label="Delete"
						title="Delete"
						size="small"
						onClick={() => onDelete(goal)}
					>
						<DeleteOutlineIcon fontSize="small" />
					</IconButton>
				</Box>
			</Box>

			<Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 2, flexWrap: "wrap" }}>
				<Typography
					sx={{
						fontSize: 24,
						fontWeight: 600,
						fontVariantNumeric: "tabular-nums",
						lineHeight: 1.2,
					}}
				>
					{formatMoney(goal.saved, goal.currency)}
				</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					of {formatMoney(goal.target_amount, goal.currency)}
				</Typography>
			</Box>

			<Bar percent={goal.percent} color={color} />

			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					mt: 1.25,
					gap: 1,
				}}
			>
				<TonalChip accent={color} label={`${goal.percent}%`} />
				<Typography
					variant="body2"
					sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
				>
					{goal.reached ? "Done" : `${formatMoney(goal.remaining, goal.currency)} to go`}
				</Typography>
			</Box>

			{plan && (
				<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
					{plan}
				</Typography>
			)}

			{goal.period_status && goal.period_planned && goal.period_contributed && (
				<Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
					<TonalChip
						accent={goal.period_status === "funded" ? ACCENT.green : ACCENT.amber}
						label={
							goal.period_status === "funded"
								? "This period: funded"
								: "This period: still to set aside"
						}
					/>
					<Typography
						variant="caption"
						sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
					>
						{formatMoney(goal.period_contributed, goal.currency)} of{" "}
						{formatMoney(goal.period_planned, goal.currency)}
					</Typography>
				</Box>
			)}

			{goal.mode === "manual" && (
				<Button size="small" sx={{ mt: 1.5, ml: -1 }} onClick={() => onAddMoney(goal)}>
					Add or take out money
				</Button>
			)}
		</Box>
	);
});

export default GoalCard;
