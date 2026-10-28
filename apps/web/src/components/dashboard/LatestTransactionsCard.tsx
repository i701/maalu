import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { formatDate, formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import type { Transaction } from "#/types/api";
import { RouterButton } from "../RouterLinks";
import ShapeTile from "../ShapeTile";
import Symbol from "../Symbol";

const KIND = {
	income: { symbol: "arrow_downward", accent: ACCENT.green, sign: "+" },
	expense: { symbol: "arrow_upward", accent: ACCENT.pink, sign: "-" },
	transfer: { symbol: "payments", accent: ACCENT.blue, sign: "" },
} as const;

function title(t: Transaction) {
	if (t.type === "transfer")
		return `${t.account?.name ?? "Account"} → ${t.to_account?.name ?? "Account"}`;
	return t.vendor?.name ?? (t.splits.length > 1 ? "Split purchase" : t.category);
}

/** The most recent transactions, newest first, with a link to all of them. */
const LatestTransactionsCard = memo(function LatestTransactionsCard({
	transactions,
}: {
	transactions: Transaction[];
}) {
	return (
		<Box
			sx={{
				p: 2.5,
				minWidth: 0,
				borderRadius: "var(--shape-xl)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
					Latest transactions
				</Typography>
				<RouterButton
					to="/transactions"
					search={{ page: 1, pageSize: 20 }}
					color="inherit"
					size="small"
				>
					View all
				</RouterButton>
			</Box>
			{transactions.length === 0 ? (
				<Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
					Nothing yet. Add a transaction to see it here.
				</Typography>
			) : (
				<Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
					{transactions.map((t) => {
						const kind = KIND[t.type];
						return (
							<Box
								component="li"
								key={t.id}
								sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}
							>
								<ShapeTile shape={0} size={40} accent={kind.accent}>
									<Symbol name={kind.symbol} size={20} filled />
								</ShapeTile>
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
										{title(t)}
									</Typography>
									<Typography noWrap variant="caption" sx={{ color: "text.secondary" }}>
										{t.type === "transfer" ? "Transfer" : t.category} ·{" "}
										{formatDate(t.transaction_date)}
									</Typography>
								</Box>
								<Typography
									sx={{
										fontSize: 14,
										fontWeight: 600,
										fontVariantNumeric: "tabular-nums",
										color:
											t.type === "income"
												? "success.main"
												: t.type === "expense"
													? "error.main"
													: "text.primary",
									}}
								>
									{kind.sign}
									{formatMoney(t.amount, t.currency)}
								</Typography>
							</Box>
						);
					})}
				</Box>
			)}
		</Box>
	);
});

export default LatestTransactionsCard;
