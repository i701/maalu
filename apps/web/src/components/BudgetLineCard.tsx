import { morph } from "#/lib/shape";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { STATUS_COLOR, STATUS_LABEL, unsigned } from "#/lib/budget";
import { formatMoney, sumDecimals } from "#/lib/format";
import type { BudgetLine } from "#/types/api";
import TonalChip from "./TonalChip";

/** The progress track: fills to the share spent (capped at the full width) in the status colour. */
function Bar({ percent, color }: { percent: number; color: string }) {
	return (
		<Box
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.min(percent, 100)}
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
					width: `${Math.min(percent, 100)}%`,
					minWidth: percent > 0 ? 10 : 0,
					borderRadius: "var(--shape-full)",
					bgcolor: color,
					transition: "width var(--spring-spatial-default-dur) var(--spring-spatial-default)",
				}}
			/>
		</Box>
	);
}

/** One spending limit: what was spent against it, what is left, and how close it is. Memoised so
 * the grid doesn't re-render while a dialog opens or the period changes. */
const BudgetLineCard = memo(function BudgetLineCard({
	line,
	currency,
	onEdit,
	onDelete,
}: {
	line: BudgetLine;
	currency: string;
	onEdit: (line: BudgetLine) => void;
	onDelete: (line: BudgetLine) => void;
}) {
	const color = STATUS_COLOR[line.status];
	const limit = sumDecimals([line.amount, line.carried]);
	const over = line.status === "over";

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
						{line.name}
					</Typography>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
						{line.categories.map((c) => (
							<TonalChip key={c.id} accent="var(--md-sys-color-outline)" label={c.name} />
						))}
					</Box>
				</Box>
				<Box sx={{ display: "flex", flexShrink: 0, mr: -0.75, mt: -0.5 }}>
					<IconButton aria-label="Edit" title="Edit" size="small" onClick={() => onEdit(line)}>
						<EditOutlinedIcon fontSize="small" />
					</IconButton>
					<IconButton
						aria-label="Delete"
						title="Delete"
						size="small"
						onClick={() => onDelete(line)}
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
					{formatMoney(line.activity, currency)}
				</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					of {formatMoney(limit, currency)}
				</Typography>
			</Box>

			<Bar percent={line.percent} color={color} />

			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					mt: 1.25,
					gap: 1,
				}}
			>
				<TonalChip accent={color} label={`${STATUS_LABEL[line.status]} · ${line.percent}%`} />
				<Typography
					variant="body2"
					sx={{ fontVariantNumeric: "tabular-nums", color: over ? color : "text.secondary" }}
				>
					{over
						? `${formatMoney(unsigned(line.available), currency)} over`
						: `${formatMoney(line.available, currency)} left`}
				</Typography>
			</Box>
			{Number(line.carried) > 0 && (
				<Typography variant="caption" sx={{ display: "block", mt: 0.75, color: "text.secondary" }}>
					Includes {formatMoney(line.carried, currency)} carried over
				</Typography>
			)}
		</Box>
	);
});

export default BudgetLineCard;
