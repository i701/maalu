import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { creditUsage } from "#/lib/accounts";
import { formatMoney } from "#/lib/format";
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
						{formatMoney(usage.owed, account.currency)} of{" "}
						{formatMoney(usage.limit, account.currency)} used ({usage.percent}%)
					</Typography>
					<Box
						role="progressbar"
						aria-valuenow={Math.min(usage.percent, 100)}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label="Credit limit used"
						sx={{
							height: 6,
							borderRadius: "var(--shape-full)",
							bgcolor: "var(--md-sys-color-surface-container-highest)",
							overflow: "hidden",
						}}
					>
						<Box
							sx={{
								height: "100%",
								width: `${Math.min(usage.percent, 100)}%`,
								bgcolor: over || usage.percent >= 80 ? "error.main" : "primary.main",
							}}
						/>
					</Box>
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
