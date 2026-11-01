import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { formatMoney, formatWhen } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import type { ReviewRow, RowPatch } from "#/lib/imports";
import type { SelectionState } from "#/lib/selection";
import type { Account } from "#/types/api";
import MobileCard from "../MobileCard";
import ResponsiveTable from "../ResponsiveTable";
import TonalChip from "../TonalChip";
import WillBeCell from "./WillBeCell";

const FLAGS = {
	reference: { label: "Already imported", accent: ACCENT.slate },
	transfer: { label: "Already recorded as a transfer", accent: ACCENT.slate },
	possible: { label: "Maybe already entered", accent: ACCENT.orange },
} as const;

const dim = (r: ReviewRow) => (r.include ? 1 : 0.55);
const key = (r: ReviewRow) => String(r.index);

function Flag({ row }: { row: ReviewRow }) {
	const flag = row.duplicate ? FLAGS[row.duplicate] : null;
	return flag ? <TonalChip accent={flag.accent} label={flag.label} /> : null;
}

function Amount({ row, currency }: { row: ReviewRow; currency: string }) {
	return (
		<Typography
			variant="body2"
			sx={{
				fontWeight: 600,
				whiteSpace: "nowrap",
				color: row.type === "income" ? "success.main" : "text.primary",
			}}
		>
			{row.type === "income" ? "+" : "−"}
			{formatMoney(row.amount, currency)}
		</Typography>
	);
}

/** The statement's rows, with a tick to select them for the bar above. Rows that will not be
 * imported are dimmed. */
const ReviewTable = memo(function ReviewTable({
	rows,
	currency,
	accounts,
	selected,
	selectionState,
	onToggle,
	onToggleAll,
	vendors,
	categories,
	names,
	onPatch,
}: {
	rows: ReviewRow[];
	currency: string;
	accounts: Map<string, Account>;
	selected: ReadonlySet<string>;
	selectionState: SelectionState;
	onToggle: (key: string) => void;
	onToggleAll: () => void;
	vendors: string[];
	categories: string[];
	/** Rows per bank name, so a row can offer to change the others named the same */
	names: Map<string, number>;
	onPatch: (index: number, patch: RowPatch, sameName: boolean) => void;
}) {
	const cell = (r: ReviewRow) => (
		<WillBeCell
			row={r}
			accounts={accounts}
			vendors={vendors}
			categories={categories}
			names={names}
			onPatch={onPatch}
		/>
	);
	return (
		<ResponsiveTable
			rows={rows}
			getKey={key}
			minWidth={720}
			head={
				<TableRow>
					<TableCell padding="checkbox">
						<Checkbox
							checked={selectionState === "all"}
							indeterminate={selectionState === "some"}
							onChange={onToggleAll}
							slotProps={{ input: { "aria-label": "Select every row on this page" } }}
						/>
					</TableCell>
					<TableCell>When</TableCell>
					<TableCell>Statement says</TableCell>
					<TableCell align="right">Amount</TableCell>
					<TableCell>Will be</TableCell>
				</TableRow>
			}
			renderRow={(r) => (
				<TableRow hover selected={selected.has(key(r))} sx={{ opacity: dim(r) }}>
					<TableCell padding="checkbox">
						<Checkbox
							checked={selected.has(key(r))}
							onChange={() => onToggle(key(r))}
							disabled={r.duplicate === "reference"}
							slotProps={{ input: { "aria-label": `Select row ${r.index + 1}` } }}
						/>
					</TableCell>
					<TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
						{formatWhen(r.date, r.time)}
					</TableCell>
					<TableCell>
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{r.counterparty || r.kind}
						</Typography>
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{r.kind}
						</Typography>{" "}
						<Flag row={r} />
					</TableCell>
					<TableCell align="right">
						<Amount row={r} currency={currency} />
					</TableCell>
					<TableCell>{cell(r)}</TableCell>
				</TableRow>
			)}
			renderCard={(r) => (
				<MobileCard
					select={
						<Checkbox
							checked={selected.has(key(r))}
							onChange={() => onToggle(key(r))}
							disabled={r.duplicate === "reference"}
							slotProps={{ input: { "aria-label": `Select row ${r.index + 1}` } }}
						/>
					}
					primary={
						<Typography variant="body2" sx={{ fontWeight: 500, opacity: dim(r) }}>
							{r.counterparty || r.kind}
						</Typography>
					}
					secondary={
						<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
							{formatWhen(r.date, r.time)}
						</Typography>
					}
					end={<Amount row={r} currency={currency} />}
					meta={
						<>
							{cell(r)}
							<Flag row={r} />
						</>
					}
				/>
			)}
		/>
	);
});

export default ReviewTable;
