import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { formatDate } from "#/lib/format";
import { formatRate, HISTORY_RANGES, summarize, type HistoryRange } from "#/lib/rates";
import { useSheet } from "#/lib/sheet";
import { getRateHistoryFn } from "#/server/currencies";
import type { Account, RateHistory } from "#/types/api";
import AreaChart from "./charts/AreaChart";

/** How the market rate of an account's currency has moved against your base currency, next to the
 * rate the account is valued at. The rates come from the market source and are kept as they are
 * seen, so the picture fills in over time. */
export default function RateHistoryDialog({
	account,
	baseCurrency,
	onClose,
}: {
	account: Account;
	baseCurrency: string;
	onClose: () => void;
}) {
	const sheet = useSheet(onClose);
	const [range, setRange] = useState<HistoryRange>(90);
	// The answer for one range. Asking for another range makes it stale until the new one arrives.
	const [loaded, setLoaded] = useState<{
		range: HistoryRange;
		history: RateHistory | null;
		error: string | null;
	} | null>(null);

	useEffect(() => {
		let current = true;
		void getRateHistoryFn({
			data: { base: account.currency, quote: baseCurrency, days: range },
		}).then((res) => {
			if (current)
				setLoaded({
					range,
					history: res.ok ? res.data : null,
					error: res.ok ? null : res.error,
				});
		});
		return () => {
			current = false;
		};
	}, [account.currency, baseCurrency, range]);

	const ready = loaded?.range === range ? loaded : null;
	const history = ready?.history ?? null;
	const failed = ready?.error ?? null;

	const summary = useMemo(() => summarize(history?.points ?? []), [history]);
	const chart = useMemo(
		() =>
			(history?.points ?? []).map((p) => ({ label: formatDate(p.date), value: Number(p.rate) })),
		[history],
	);
	const pair = `${account.currency} → ${baseCurrency}`;

	return (
		<Dialog
			open={sheet.open}
			onClose={sheet.close}
			maxWidth="sm"
			fullWidth
			aria-labelledby="rate-history-title"
			slotProps={{ transition: { onExited: sheet.onExited } }}
		>
			<DialogTitle id="rate-history-title">Rate history, {pair}</DialogTitle>
			<DialogContent>
				<Stack sx={{ gap: 2 }}>
					<ToggleButtonGroup
						exclusive
						size="small"
						value={range}
						onChange={(_, value: HistoryRange | null) => value && setRange(value)}
						aria-label="How far back"
					>
						{HISTORY_RANGES.map((d) => (
							<ToggleButton key={d} value={d} sx={{ px: 1.5, py: 0.25 }}>
								{d === 365 ? "1 year" : `${d} days`}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
					{failed && <Alert severity="warning">{failed}</Alert>}
					{ready === null && <Typography sx={{ color: "text.secondary" }}>Looking…</Typography>}
					{summary && (
						<>
							<Typography variant="body2">
								Market {formatRate(summary.last)} · this account is valued at{" "}
								<strong>{formatRate(Number(account.exchange_rate))}</strong>
								{account.auto_rate ? " (kept up to date)" : ""}
							</Typography>
							<AreaChart
								points={chart}
								name={pair}
								formatValue={(v) => formatRate(v)}
								formatTick={(v) => formatRate(v)}
								ariaLabel={`Market rate ${pair} over the last ${range} days, from ${formatRate(summary.first)} to ${formatRate(summary.last)}`}
								height={180}
							/>
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								Low {formatRate(summary.low)} · High {formatRate(summary.high)} · Moved{" "}
								{summary.change >= 0 ? "+" : ""}
								{summary.change.toFixed(2)}% over the period. Source: {history?.source}.
							</Typography>
						</>
					)}
				</Stack>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={sheet.close}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}
