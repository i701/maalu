import { useCompactCard } from "#/lib/compact-card";
import Money from "#/components/Money";
import { morph } from "#/lib/shape";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { fixedWindow, runsWindow, STATUS_COLOR, STATUS_LABEL, unsigned } from "#/lib/budget";
import { periodLimit, type LineMove } from "#/lib/budget-moves";
import { formatMoney } from "#/lib/format";
import { KIND_COLOR, KIND_NAMES } from "#/lib/needs-wants";
import type { BudgetFixedLine, BudgetLine } from "#/types/api";
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
				mt: { xs: 0.75, sm: 1.5 },
				height: { xs: 6, sm: 10 },
				borderRadius: "var(--shape-full)",
				bgcolor: "var(--md-sys-color-surface-container-highest)",
				overflow: "hidden",
			}}
		>
			<Box
				sx={{
					height: "100%",
					width: `${Math.min(percent, 100)}%`,
					minWidth: percent > 0 ? 6 : 0,
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
	moves,
	onMove,
	onUndoMove,
	onHistory,
	onRepeat,
}: {
	line: BudgetLine | BudgetFixedLine;
	currency: string;
	onEdit: (line: BudgetLine) => void;
	onDelete: (line: BudgetLine) => void;
	/** Money moved in or out this period (monthly limits only) */
	moves?: LineMove[];
	/** Open "move money here"; left out for limits for set dates */
	onMove?: (line: BudgetLine) => void;
	onUndoMove?: (moveId: string) => void;
	/** Open the log of every move into or out of this limit */
	onHistory?: (line: BudgetLine) => void;
	/** Start the next stretch from a limit for set dates that is running or over */
	onRepeat?: (line: BudgetFixedLine) => void;
}) {
	const color = STATUS_COLOR[line.status];
	const limit = periodLimit(line);
	const over = line.status === "over";
	const dated = "end_date" in line ? line : null;
	const card = useCompactCard();

	return (
		<Box
			{...card.rootProps}
			sx={{
				p: { xs: 1.5, sm: 2.5 },
				...morph("xl"),
				// an opened card on a phone is tinted, like an opened row
				bgcolor: card.opened
					? "color-mix(in srgb, var(--md-sys-color-secondary-container) 55%, transparent)"
					: "var(--md-sys-color-surface-container-low)",
				cursor: { xs: "pointer", sm: "default" },
			}}
		>
			<Box
				sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}
			>
				<Box sx={{ minWidth: 0 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
						{line.name}
					</Typography>
					{(dated ? fixedWindow(dated) : runsWindow(line)) && (
						<Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
							{dated ? fixedWindow(dated) : runsWindow(line)}
						</Typography>
					)}
					<Box sx={{ display: card.show("flex"), flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
						{line.kind && (
							<TonalChip
								accent={KIND_COLOR[line.kind]}
								label={KIND_NAMES[line.kind]}
								title="Every category in this limit counts as this"
							/>
						)}
						{line.categories.map((c) => (
							<TonalChip key={c.id} accent="var(--md-sys-color-outline)" label={c.name} />
						))}
					</Box>
				</Box>
				<Box sx={{ display: "flex", flexShrink: 0, mr: -0.75, mt: -0.5 }}>
					<IconButton
						{...card.toggleProps}
						size="small"
						sx={{
							display: { xs: "inline-flex", sm: "none" },
							transform: card.open ? "rotate(180deg)" : "none",
							transition: "transform var(--spring-spatial-fast-dur) var(--spring-spatial-fast)",
						}}
					>
						<ExpandMoreIcon fontSize="small" />
					</IconButton>
					<IconButton
						aria-label="Edit"
						title="Edit"
						size="small"
						sx={{ display: card.show("inline-flex") }}
						onClick={() => onEdit(line)}
					>
						<EditOutlinedIcon fontSize="small" />
					</IconButton>
					<IconButton
						aria-label="Delete"
						title="Delete"
						size="small"
						sx={{ display: card.show("inline-flex") }}
						onClick={() => onDelete(line)}
					>
						<DeleteOutlineIcon fontSize="small" />
					</IconButton>
				</Box>
			</Box>

			<Box
				sx={{
					display: "flex",
					alignItems: "baseline",
					gap: 1,
					mt: { xs: 0.5, sm: 2 },
					flexWrap: "wrap",
				}}
			>
				<Typography
					sx={{
						fontSize: { xs: 18, sm: 24 },
						fontWeight: 600,
						fontVariantNumeric: "tabular-nums",
						lineHeight: 1.2,
					}}
				>
					<Money amount={line.activity} currency={currency} />
				</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					of <Money amount={limit} currency={currency} />
				</Typography>
			</Box>

			<Bar percent={line.percent} color={color} />

			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					mt: { xs: 0.5, sm: 1.25 },
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
				<Typography
					variant="caption"
					sx={{ display: card.show("block"), mt: 0.75, color: "text.secondary" }}
				>
					Includes <Money amount={line.carried} currency={currency} /> carried over
				</Typography>
			)}
			{moves?.map((m) => (
				<Box
					key={m.id}
					sx={{ display: card.show("flex"), alignItems: "center", gap: 0.5, mt: 0.5 }}
				>
					<Typography
						variant="caption"
						sx={{
							color: "text.secondary",
							flex: 1,
							minWidth: 0,
							fontVariantNumeric: "tabular-nums",
						}}
					>
						{m.text} this period{m.note ? ` · ${m.note}` : ""}
					</Typography>
					{onUndoMove && (
						<Button size="small" color="inherit" onClick={() => onUndoMove(m.id)}>
							Undo
						</Button>
					)}
				</Box>
			))}
			{dated && onRepeat && dated.state !== "upcoming" && (
				<Box sx={{ display: card.show("flex"), mt: 1, ml: -1 }}>
					<Button size="small" onClick={() => onRepeat(dated)}>
						Repeat for the next stretch
					</Button>
				</Box>
			)}
			{(onMove || onHistory) && (
				<Box sx={{ display: card.show("flex"), gap: 0.5, mt: 1, ml: -1 }}>
					{onMove && (
						<Button size="small" onClick={() => onMove(line)}>
							Move money here
						</Button>
					)}
					{onHistory && (
						<Button size="small" color="inherit" onClick={() => onHistory(line)}>
							History
						</Button>
					)}
				</Box>
			)}
		</Box>
	);
});

export default BudgetLineCard;
