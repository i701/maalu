import DownloadIcon from "@mui/icons-material/Download";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { resultLine } from "#/lib/imports";
import type { ReviewRow } from "#/lib/imports";
import type { ImportResult } from "#/types/api";

type Row = Pick<ReviewRow, "counterparty" | "kind" | "date">;

/** What an import did: how many went in, which rows did not and why, with the CSV report to keep.
 * A bad row never fails the rest, so this is where the user learns about it. */
export default function ResultDialog({
	result,
	rows,
	onClose,
}: {
	result: ImportResult;
	/** The rows that were sent, in order, to name the ones that failed */
	rows: Row[];
	onClose: () => void;
}) {
	const { batch, skipped } = result;
	const failed = skipped.filter((s) => s.outcome === "failed");
	const already = skipped.length - failed.length;
	return (
		<Dialog open onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="import-result-title">
			<DialogTitle id="import-result-title">Import finished</DialogTitle>
			<DialogContent>
				<Alert severity={failed.length ? "warning" : "success"} sx={{ mb: 2 }}>
					{resultLine(batch.imported_count, already, failed.length)}
				</Alert>
				{failed.length > 0 && (
					<List dense aria-label="Rows that failed">
						{failed.map((f) => {
							const row = rows[f.index];
							return (
								<ListItem key={f.index} disableGutters>
									<ListItemText
										primary={`Row ${f.index + 1}: ${row?.counterparty || row?.kind || ""} (${row?.date ?? ""})`}
										secondary={f.reason}
									/>
								</ListItem>
							);
						})}
					</List>
				)}
			</DialogContent>
			<DialogActions>
				<Button
					component="a"
					href={`/api/imports/${batch.id}/report`}
					download
					startIcon={<DownloadIcon />}
				>
					Download report (CSV)
				</Button>
				<Button variant="contained" onClick={onClose}>
					Done
				</Button>
			</DialogActions>
		</Dialog>
	);
}
