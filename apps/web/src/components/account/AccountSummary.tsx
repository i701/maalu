import Box from "@mui/material/Box";
import { creditUsage } from "#/lib/accounts";
import { formatMoney } from "#/lib/format";
import type { Account, TransactionTotals } from "#/types/api";
import CreditUsage from "../CreditUsage";
import MetricCard from "../dashboard/MetricCard";

/** The figures at the top of an account's page: what it holds, and what came in and went out this
 * month (in your base currency, transfers left out). */
export default function AccountSummary({
	account,
	totals,
	baseCurrency,
	monthLabel,
}: {
	account: Account;
	totals: TransactionTotals;
	baseCurrency: string;
	monthLabel: string;
}) {
	const foreign = account.currency !== baseCurrency;
	return (
		<Box sx={{ mb: 2.5 }}>
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" },
				}}
			>
				<MetricCard
					label={creditUsage(account) ? "Owed" : "Balance"}
					value={formatMoney(account.balance, account.currency)}
				/>
				<MetricCard
					label={`In ${monthLabel}`}
					value={formatMoney(totals.income, totals.currency)}
				/>
				<MetricCard
					label={`Out in ${monthLabel}`}
					value={formatMoney(totals.expense, totals.currency)}
				/>
			</Box>
			{foreign && (
				<Box sx={{ color: "text.secondary", fontSize: 13, mt: 1 }}>
					Worth about {formatMoney(account.base_balance, baseCurrency)} at{" "}
					{Number(account.exchange_rate)}. This month's figures are in {baseCurrency}.
				</Box>
			)}
			<CreditUsage account={account} />
		</Box>
	);
}
