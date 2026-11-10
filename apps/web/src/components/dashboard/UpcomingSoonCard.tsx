import { useCardMorph } from "#/lib/card-morph";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { formatMoney } from "#/lib/format";
import { dueLabel, isOverdue } from "#/lib/planned";
import { txTitle } from "#/lib/tx-display";
import type { Transaction } from "#/types/api";
import { RouterLink } from "../RouterLinks";

/** How many planned transactions the card lists; the Month plan has them all. */
export const UPCOMING_SHOWN = 5;

/** The next planned bills and income, soonest first (overdue ones lead), with a link to the Month
 * plan where they can be marked as paid. */
const UpcomingSoonCard = memo(function UpcomingSoonCard({
	upcoming,
	today,
}: {
	upcoming: Transaction[];
	today: string;
}) {
	const cardMorph = useCardMorph();
	const shown = upcoming.slice(0, UPCOMING_SHOWN);
	const more = upcoming.length - shown.length;
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
				<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
					Coming up
				</Typography>
				<RouterLink to="/plan">Open the month plan</RouterLink>
			</Box>
			{shown.length === 0 ? (
				<Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
					Nothing planned. Bills from your subscriptions and planned transactions appear here.
				</Typography>
			) : (
				<Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
					{shown.map((t) => {
						const late = isOverdue(t, today);
						const income = t.type === "income";
						return (
							<Box
								component="li"
								key={t.id}
								sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}
							>
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
										{txTitle(t)}
									</Typography>
									<Typography
										noWrap
										variant="caption"
										sx={{ color: late ? "error.main" : "text.secondary" }}
									>
										{dueLabel(t.transaction_date, today)}
									</Typography>
								</Box>
								<Typography
									sx={{
										fontSize: 14,
										fontWeight: 600,
										fontVariantNumeric: "tabular-nums",
										color: income ? "success.main" : "text.primary",
									}}
								>
									{income ? "+" : "-"}
									{formatMoney(t.amount, t.currency)}
								</Typography>
							</Box>
						);
					})}
					{more > 0 && (
						<Typography
							variant="caption"
							sx={{ color: "text.secondary", display: "block", pt: 0.5 }}
						>
							and {more} more on the month plan
						</Typography>
					)}
				</Box>
			)}
		</Box>
	);
});

export default UpcomingSoonCard;
