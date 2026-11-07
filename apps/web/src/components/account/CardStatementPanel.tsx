import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { scheduleText, statementLine, statementStatus } from "#/lib/card-statement";
import { formatDate, formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import type { CardStatement } from "#/types/api";
import TonalChip from "../TonalChip";

const TONE_ACCENT = {
	ok: ACCENT.blue,
	warn: ACCENT.amber,
	late: "var(--md-sys-color-error)",
	quiet: "var(--md-sys-color-outline)",
} as const;

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
	return (
		<Box sx={{ minWidth: 0 }}>
			<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
				{label}
			</Typography>
			<Typography sx={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
				{value}
			</Typography>
			{note && (
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{note}
				</Typography>
			)}
		</Box>
	);
}

/** A credit card's last statement: what was owed when it closed, what has been paid since, what is
 * still to pay and by when. Spending since it closed goes on the next one. */
const CardStatementPanel = memo(function CardStatementPanel({
	statement: s,
	onRepay,
}: {
	statement: CardStatement;
	/** Start a repayment; absent when the card has no account to be repaid from */
	onRepay?: () => void;
}) {
	const money = (v: string) => formatMoney(v, s.currency);
	const status = statementStatus(s);
	const owes = s.state === "due" || s.state === "overdue";
	return (
		<Box
			sx={{
				p: 2.5,
				mb: 2,
				borderRadius: "var(--shape-xl)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
				<Box>
					<Typography variant="h2" sx={{ fontSize: 18, fontWeight: 600 }}>
						Statement
					</Typography>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						{scheduleText(s)}
					</Typography>
				</Box>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<TonalChip accent={TONE_ACCENT[status.tone]} label={status.label} />
					{owes && onRepay && (
						<Button size="small" variant="outlined" onClick={onRepay}>
							Repay
						</Button>
					)}
				</Box>
			</Box>
			<Typography sx={{ mt: 1.5, fontSize: 15 }}>{statementLine(s)}</Typography>
			<Box
				sx={{
					display: "grid",
					gap: 2,
					mt: 2,
					gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
				}}
			>
				<Figure
					label="On the statement"
					value={money(s.statement_balance)}
					note={`Closed ${formatDate(s.closed_on)}`}
				/>
				<Figure label="Paid since" value={money(s.paid_since)} />
				<Figure
					label="Still to pay"
					value={money(s.remaining)}
					note={`Due ${formatDate(s.due_on)}`}
				/>
				<Figure
					label="Spent since"
					value={money(s.spent_since)}
					note={`Next closes ${formatDate(s.next_closes_on)}`}
				/>
			</Box>
		</Box>
	);
});

export default CardStatementPanel;
