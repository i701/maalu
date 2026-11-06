import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { historyByPeriod, madeAt, moveText } from "#/lib/budget-moves";
import { formatDate } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { useSheet } from "#/lib/sheet";
import { budgetLineHistoryFn } from "#/server/budget";
import type { BudgetLine, BudgetMoveLogEntry } from "#/types/api";
import TonalChip from "./TonalChip";

/** Every move into or out of a limit, in every period, grouped by period: what moved where, when it
 * was made, the note, and whether it was undone (undone moves stay, marked, so nothing disappears). */
export default function MoveHistoryDialog({
	line,
	currency,
	onClose,
}: {
	line: BudgetLine;
	currency: string;
	onClose: () => void;
}) {
	const sheet = useSheet(onClose);
	const [loaded, setLoaded] = useState<{
		entries: BudgetMoveLogEntry[];
		error: string | null;
	} | null>(null);

	useEffect(() => {
		let current = true;
		void budgetLineHistoryFn({ data: { id: line.id } }).then((res) => {
			if (current) setLoaded({ entries: res.ok ? res.data : [], error: res.ok ? null : res.error });
		});
		return () => {
			current = false;
		};
	}, [line.id]);

	const periods = loaded ? historyByPeriod(loaded.entries) : [];

	return (
		<Dialog
			open={sheet.open}
			onClose={sheet.close}
			maxWidth="sm"
			fullWidth
			aria-labelledby="move-history-title"
			slotProps={{ transition: { onExited: sheet.onExited } }}
		>
			<DialogTitle id="move-history-title">Money moved, {line.name}</DialogTitle>
			<DialogContent>
				{loaded === null && <Typography sx={{ color: "text.secondary" }}>Looking…</Typography>}
				{loaded?.error && <Alert severity="warning">{loaded.error}</Alert>}
				{loaded && !loaded.error && periods.length === 0 && (
					<Typography sx={{ color: "text.secondary" }}>
						No money has been moved into or out of this limit yet.
					</Typography>
				)}
				<Stack sx={{ gap: 2.5 }}>
					{periods.map((p) => (
						<Box key={p.start}>
							<Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
								{formatDate(p.start)} – {formatDate(p.end)}
							</Typography>
							<Stack sx={{ gap: 1 }}>
								{p.entries.map((e) => (
									<HistoryRow key={e.id} entry={e} lineId={line.id} currency={currency} />
								))}
							</Stack>
						</Box>
					))}
				</Stack>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={sheet.close}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}

function HistoryRow({
	entry,
	lineId,
	currency,
}: {
	entry: BudgetMoveLogEntry;
	lineId: string;
	currency: string;
}) {
	const undone = entry.undone_at !== null;
	return (
		<Box
			sx={{
				p: 1.5,
				borderRadius: "var(--shape-md)",
				bgcolor: "var(--md-sys-color-surface-container)",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
				<Typography
					sx={{
						fontWeight: 600,
						fontVariantNumeric: "tabular-nums",
						textDecoration: undone ? "line-through" : "none",
						color: undone ? "text.secondary" : "text.primary",
					}}
				>
					{moveText(entry, lineId, currency)}
				</Typography>
				{undone && <TonalChip accent={ACCENT.slate} label="Undone" />}
			</Box>
			{entry.note && (
				<Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
					{entry.note}
				</Typography>
			)}
			<Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
				Made {madeAt(entry.created_at)}
				{entry.undone_at ? ` · undone ${madeAt(entry.undone_at)}` : ""}
			</Typography>
		</Box>
	);
}
