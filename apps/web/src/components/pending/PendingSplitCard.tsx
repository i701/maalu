import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { formatDate, formatMoney } from "#/lib/format";
import { madeTotal, pendingLines, ruleText } from "#/lib/salary";
import { morph } from "#/lib/shape";
import type { SalarySplitTask } from "#/types/api";
import TonalChip from "../TonalChip";
import { ACCENT } from "#/lib/m3";

/** One salary waiting for its split: what arrived, what is proposed, what was already moved by an
 * automatic rule, and the three things you can do. */
const PendingSplitCard = memo(function PendingSplitCard({
	task,
	busy,
	onApprove,
	onReview,
	onDismiss,
}: {
	task: SalarySplitTask;
	busy: boolean;
	onApprove: (task: SalarySplitTask) => void;
	onReview: (task: SalarySplitTask) => void;
	onDismiss: (task: SalarySplitTask) => void;
}) {
	const { plan } = task;
	const ready = pendingLines(plan);
	const blocked = plan.items.filter((i) => !i.ok);
	const made = plan.made ?? [];
	const sent = madeTotal(plan);

	return (
		<Box
			component="li"
			sx={{
				p: 2.5,
				...morph("xl"),
				bgcolor: "var(--md-sys-color-surface-container-low)",
				display: "grid",
				gap: 1.5,
			}}
		>
			<Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
				<Box>
					<Typography sx={{ fontWeight: 600, fontSize: 16 }}>{plan.title}</Typography>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{plan.salary_date ? `${formatDate(plan.salary_date)} · ` : ""}
						{plan.account_name}
					</Typography>
				</Box>
				<Typography sx={{ fontWeight: 600, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>
					{formatMoney(plan.amount, plan.currency)}
				</Typography>
			</Box>

			{made.length > 0 && (
				<Box>
					<Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 0.6 }}>
						Already moved
					</Typography>
					{made.map((m) => (
						<Typography key={m.id} variant="body2">
							{m.target_name}: {formatMoney(m.amount, plan.currency)}{" "}
							{m.kind === "transfer" ? "moved" : "set aside"}
						</Typography>
					))}
				</Box>
			)}

			<Box>
				<Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 0.6 }}>
					Waiting for you
				</Typography>
				{ready.length === 0 && (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						Nothing can be made right now.
					</Typography>
				)}
				{ready.map((i) => (
					<Box
						key={i.rule_id}
						sx={{
							display: "flex",
							justifyContent: "space-between",
							gap: 2,
							alignItems: "baseline",
						}}
					>
						<Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
							{i.target_name}
							<Typography
								component="span"
								variant="caption"
								sx={{ ml: 1, color: "text.secondary" }}
							>
								{ruleText(i, plan.currency)}
							</Typography>
						</Typography>
						<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
							{formatMoney(i.amount, plan.currency)}
						</Typography>
					</Box>
				))}
				{blocked.map((i) => (
					<Typography key={i.rule_id} variant="caption" component="p" sx={{ color: "error.main" }}>
						{i.target_name}: {i.reason}
					</Typography>
				))}
			</Box>

			<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{plan.over ? (
						<TonalChip accent={ACCENT.orange} label="Adds up to more than the salary" />
					) : (
						`Moving ${formatMoney(plan.total, plan.currency)}${sent !== "0.00" ? " more" : ""}. ${formatMoney(plan.left, plan.currency)} stays in ${plan.account_name}.`
					)}
				</Typography>
			</Box>

			<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
				<Button
					variant="contained"
					disabled={busy || ready.length === 0 || plan.over}
					onClick={() => onApprove(task)}
				>
					Approve
				</Button>
				<Button variant="outlined" disabled={busy} onClick={() => onReview(task)}>
					Review and edit
				</Button>
				<Button color="inherit" disabled={busy} onClick={() => onDismiss(task)}>
					Dismiss
				</Button>
			</Box>
		</Box>
	);
});

export default PendingSplitCard;
