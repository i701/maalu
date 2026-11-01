import DownloadIcon from "@mui/icons-material/Download";
import UndoIcon from "@mui/icons-material/Undo";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { plural } from "#/lib/imports";
import type { ImportBatch } from "#/types/api";
import MobileCard from "../MobileCard";
import ResponsiveTable from "../ResponsiveTable";

const when = (iso: string) =>
	new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

const counts = (b: ImportBatch) =>
	[
		`${plural(b.imported_count, "imported", "imported")}`,
		b.skipped_count ? `${b.skipped_count} not imported` : null,
		b.transaction_count < b.imported_count ? `${b.transaction_count} still there` : null,
	]
		.filter(Boolean)
		.join(" · ");

function Actions({ batch, onUndo }: { batch: ImportBatch; onUndo: (b: ImportBatch) => void }) {
	return (
		<>
			<IconButton
				component="a"
				href={`/api/imports/${batch.id}/report`}
				download
				aria-label="Download the report"
				title="Download the report (CSV)"
				size="small"
			>
				<DownloadIcon fontSize="small" />
			</IconButton>
			<IconButton
				aria-label="Undo this import"
				title="Undo this import"
				size="small"
				disabled={batch.transaction_count === 0}
				onClick={() => onUndo(batch)}
			>
				<UndoIcon fontSize="small" />
			</IconButton>
		</>
	);
}

/** Earlier imports: when, from which file and account, what they did, with the report and undo. */
const HistoryTable = memo(function HistoryTable({
	items,
	onUndo,
}: {
	items: ImportBatch[];
	onUndo: (batch: ImportBatch) => void;
}) {
	return (
		<ResponsiveTable
			rows={items}
			getKey={(b) => b.id}
			minWidth={640}
			head={
				<TableRow>
					<TableCell>When</TableCell>
					<TableCell>File</TableCell>
					<TableCell>Account</TableCell>
					<TableCell>Result</TableCell>
					<TableCell align="right" sx={{ width: 100 }} />
				</TableRow>
			}
			renderRow={(b) => (
				<TableRow hover>
					<TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
						{when(b.created_at)}
					</TableCell>
					<TableCell>{b.filename}</TableCell>
					<TableCell>{b.account?.name ?? "—"}</TableCell>
					<TableCell>{counts(b)}</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<Actions batch={b} onUndo={onUndo} />
					</TableCell>
				</TableRow>
			)}
			renderCard={(b) => (
				<MobileCard
					primary={
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{b.filename}
						</Typography>
					}
					secondary={
						<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
							{when(b.created_at)} · {b.account?.name ?? "—"}
						</Typography>
					}
					meta={<Typography variant="caption">{counts(b)}</Typography>}
					actions={<Actions batch={b} onUndo={onUndo} />}
				/>
			)}
		/>
	);
});

export default HistoryTable;
