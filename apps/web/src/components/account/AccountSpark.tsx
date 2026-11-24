import Box from "@mui/material/Box";
import { memo } from "react";
import { formatMoney } from "#/lib/format";
import type { AccountTrend } from "#/types/api";
import Sparkline from "../charts/Sparkline";

/** How many days the small chart on an account's row looks back. The server's default. */
export const TREND_DAYS = 30;

/** The small trend line under an account's name: where its balance has been heading over the last month.
 * Nothing when the account has no history to draw (a brand-new one, or a flat zero). */
const AccountSpark = memo(function AccountSpark({
	trend,
	align = "start",
}: {
	trend: AccountTrend | undefined;
	/** Which edge of its space the line sits on */
	align?: "start" | "end";
}) {
	if (!trend || trend.balances.length < 2) return null;
	const first = trend.balances[0];
	const last = trend.balances[trend.balances.length - 1];
	return (
		<Box sx={{ display: "flex", justifyContent: align === "end" ? "flex-end" : "flex-start" }}>
			<Sparkline
				values={trend.balances.map(Number)}
				label={`Balance over the last ${TREND_DAYS} days: from ${formatMoney(first, trend.currency)} to ${formatMoney(last, trend.currency)}`}
			/>
		</Box>
	);
});

export default AccountSpark;
