import Box from "@mui/material/Box";
import Money from "#/components/Money";
import ProgressBar from "#/components/ProgressBar";
import Typography from "@mui/material/Typography";
import { creditUsage } from "#/lib/accounts";
import type { Account } from "#/types/api";
import TonalChip from "./TonalChip";

/** On an account's card: how much of its credit limit is used, as a bar with the figures, and a
 * note when the account is left out of the totals. Nothing for an account with neither. */
export default function CreditUsage({ account }: { account: Account }) {
	const usage = creditUsage(account);
	if (!usage && !account.exclude_from_stats) return null;
	const over = usage ? usage.percent > 100 : false;
	return (
		<Box sx={{ mt: 0.5, display: "grid", gap: 0.5 }}>
			{usage && (
				<>
					<Typography variant="caption" sx={{ color: over ? "error.main" : "text.secondary" }}>
						<Money amount={usage.owed} currency={account.currency} /> of{" "}
						<Money amount={usage.limit} currency={account.currency} /> used ({usage.percent}%)
					</Typography>
					<ProgressBar
						percent={usage.percent}
						color={over || usage.percent >= 80 ? "error.main" : "primary.main"}
						height={6}
						label="Credit limit used"
					/>
				</>
			)}
			{account.exclude_from_stats && (
				<Box>
					<TonalChip accent="#64748B" label="Not in my totals" />
				</Box>
			)}
		</Box>
	);
}
