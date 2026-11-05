import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { accountEffect, signOf } from "#/lib/account-detail";
import { formatDate, formatMoney } from "#/lib/format";
import { dueLabel } from "#/lib/planned";
import { txTitle } from "#/lib/tx-display";
import type { Transaction } from "#/types/api";
import { RouterLink } from "../RouterLinks";

/** What is planned for this account and has not happened yet. It counts toward nothing until it is
 * marked as paid, which is done from the Month plan or the Transactions page. */
export default function AccountPlanned({
	items,
	accountId,
	today,
}: {
	items: Transaction[];
	accountId: string;
	today: string;
}) {
	if (items.length === 0) return null;
	return (
		<Box
			sx={{
				p: 2.5,
				mb: 2,
				borderRadius: "var(--shape-xl)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
				<Typography variant="h2" sx={{ fontSize: 18, fontWeight: 600 }}>
					Planned
				</Typography>
				<RouterLink to="/plan">Open the month plan</RouterLink>
			</Box>
			<Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1, p: 0, display: "grid", gap: 0.75 }}>
				{items.map((t) => {
					const effect = accountEffect(t, accountId);
					return (
						<Box
							component="li"
							key={t.id}
							sx={{
								display: "flex",
								justifyContent: "space-between",
								gap: 2,
								alignItems: "baseline",
							}}
						>
							<Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
								{txTitle(t)}
								<Typography
									component="span"
									variant="caption"
									sx={{ ml: 1, color: "text.secondary" }}
								>
									{formatDate(t.transaction_date)} · {dueLabel(t.transaction_date, today)}
								</Typography>
							</Typography>
							<Typography
								variant="body2"
								sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
							>
								{signOf(effect)}
								{formatMoney(effect.amount, effect.currency)}
							</Typography>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}
