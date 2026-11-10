import Box from "@mui/material/Box";
import { memo } from "react";
import { formatMoney } from "#/lib/format";
import type { AccountTrend } from "#/types/api";
import Sparkline from "../charts/Sparkline";

/** How many days the small chart on an account's row looks back. The server's default. */
export const TREND_DAYS = 30;

/** The small trend line under an account's name: where its balance has been heading over the last month.
 * Nothing when the account has no history to draw (a brand-new one, or a flat zero). */
const AccountSpark = memo(function AccountSpark({ trend }: { trend: AccountTrend | undefined }) {
	if (!trend || trend.balances.length < 2) return null;
	const first = trend.balances[0] as string;
	const last = trend.balances.at(-1) as string;
	return (
		<Box sx={{ display: "flex", justifyContent: "flex-start", mt: 0.5 }}>
			<Sparkline
				values={trend.balances.map(Number)}
				label={`Balance over the last ${TREND_DAYS} days: from ${formatMoney(first, trend.currency)} to ${formatMoney(last, trend.currency)}`}
			/>
		</Box>
	);
});

export default AccountSpark;
