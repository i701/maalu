import { morph } from "#/lib/shape";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { creditUsage } from "#/lib/accounts";
import { formatMoney } from "#/lib/format";
import type { Account } from "#/types/api";
import { RouterButton } from "../RouterLinks";

/** Each card or overdraft that has a credit limit: what is owed against it, as a bar. */
const CreditUsageCard = memo(function CreditUsageCard({ accounts }: { accounts: Account[] }) {
	return (
		<Box
			sx={{
				p: 2.5,
				minWidth: 0,
				...morph("xl"),
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
					Credit used
				</Typography>
				<RouterButton to="/accounts" search={{ q: undefined }} color="inherit" size="small">
					Open
				</RouterButton>
			</Box>
			<Box sx={{ display: "grid", gap: 1.5 }}>
				{accounts.map((a) => {
					const usage = creditUsage(a);
					if (!usage) return null;
					const width = Math.min(usage.percent, 100);
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
									{formatMoney(usage.owed, a.currency)} of {formatMoney(usage.limit, a.currency)} ·{" "}
									{usage.percent}%
								</Typography>
							</Box>
							<Box
								role="progressbar"
								aria-label={`Credit used on ${a.name}`}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-valuenow={width}
								sx={{
									mt: 0.75,
									height: 8,
									borderRadius: "var(--shape-full)",
									bgcolor: "var(--md-sys-color-surface-container-highest)",
									overflow: "hidden",
								}}
							>
								<Box
									sx={{
										height: "100%",
										width: `${width}%`,
										minWidth: width > 0 ? 8 : 0,
										borderRadius: "var(--shape-full)",
										bgcolor: high ? "error.main" : "primary.main",
									}}
								/>
							</Box>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
});

export default CreditUsageCard;
