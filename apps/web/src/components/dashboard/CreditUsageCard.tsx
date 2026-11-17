import { useCardMorph } from "#/lib/card-morph";
import Money from "#/components/Money";
import ProgressBar from "#/components/ProgressBar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { creditUsage } from "#/lib/accounts";
import type { Account } from "#/types/api";
import { RouterButton } from "../RouterLinks";

/** Each card or overdraft that has a credit limit: what is owed against it, as a bar. */
const CreditUsageCard = memo(function CreditUsageCard({ accounts }: { accounts: Account[] }) {
	const cardMorph = useCardMorph();
	return (
		<Box
			sx={{
				p: 2.5,
				minWidth: 0,
				...cardMorph,
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
				<Typography variant="subtitle1">Credit used</Typography>
				<RouterButton to="/accounts" search={{ q: undefined }} color="inherit" size="small">
					Open
				</RouterButton>
			</Box>
			<Box sx={{ display: "grid", gap: 1.5 }}>
				{accounts.map((a) => {
					const usage = creditUsage(a);
					if (!usage) return null;
					const high = usage.percent >= 80;
					return (
						<Box key={a.id}>
							<Box
								sx={{
									display: "flex",
									justifyContent: "space-between",
									gap: 1,
									alignItems: "baseline",
								}}
							>
								<Typography variant="body2" sx={{ fontWeight: 500 }}>
									{a.name}
								</Typography>
								<Typography
									variant="body2"
									sx={{
										fontVariantNumeric: "tabular-nums",
										color: high ? "error.main" : "text.secondary",
									}}
								>
									<Money amount={usage.owed} currency={a.currency} /> of{" "}
									<Money amount={usage.limit} currency={a.currency} /> · {usage.percent}%
								</Typography>
							</Box>
							<ProgressBar
								percent={usage.percent}
								color={high ? "error.main" : "primary.main"}
								height={8}
								label={`Credit used on ${a.name}`}
								sx={{ mt: 0.75 }}
							/>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
});

export default CreditUsageCard;
