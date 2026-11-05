import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ACCENT } from "#/lib/m3";
import { formatMoney, formatWhen } from "#/lib/format";
import { dueLabel, isOverdue, localToday } from "#/lib/planned";
import { txTitle } from "#/lib/tx-display";
import type { Transaction } from "#/types/api";
import MarkPaidDialog from "./MarkPaidDialog";
import SalarySplitHost from "./SalarySplitHost";
import { useSalaryOffer } from "#/lib/use-salary-offer";
import { TagChips } from "./TagChip";
import TonalChip from "./TonalChip";

const SIGN = { income: "+", expense: "−", transfer: "" } as const;

/** The planned transactions, soonest first, with a one-click "Mark as paid". They count toward
 * nothing until then; ones whose day has passed say how late they are. */
export default function UpcomingCard({
	items,
	baseCurrency,
	onEdit,
	onDelete,
}: {
	items: Transaction[];
	/** Your base currency, so a bill in another one can be paid at its real rate */
	baseCurrency?: string;
	onEdit: (t: Transaction) => void;
	onDelete: (t: Transaction) => void;
}) {
	const [paying, setPaying] = useState<Transaction | null>(null);
	const salary = useSalaryOffer();
	const today = localToday();
	if (items.length === 0) return null;
	const overdueCount = items.filter((t) => isOverdue(t, today)).length;

	return (
		<>
			<Accordion
				disableGutters
				elevation={0}
				square
				aria-label="Upcoming transactions"
				sx={{
					mb: 2,
					borderRadius: "var(--shape-xl) !important",
					bgcolor: "var(--md-sys-color-surface-container-low)",
					backgroundImage: "none",
					"&::before": { display: "none" },
				}}
			>
				<AccordionSummary
					expandIcon={<ExpandMoreIcon />}
					sx={{ px: 2, borderRadius: "var(--shape-xl)" }}
				>
					<Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
						<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
							Upcoming
						</Typography>
						<TonalChip accent={ACCENT.blue} label={String(items.length)} />
						{overdueCount > 0 && (
							<TonalChip accent="var(--md-sys-color-error)" label={`${overdueCount} overdue`} />
						)}
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							Next: {txTitle(items[0])}, {dueLabel(items[0].transaction_date, today).toLowerCase()}
						</Typography>
					</Stack>
				</AccordionSummary>
				<AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
					<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
						Planned, not counted until you mark them paid
					</Typography>
					<Stack sx={{ gap: 0.5 }}>
						{items.map((t) => {
							const overdue = isOverdue(t, today);
							return (
								<Stack
									key={t.id}
									direction="row"
									sx={{ alignItems: "center", gap: 1.5, flexWrap: "wrap", py: 0.75 }}
								>
									<TonalChip
										accent={overdue ? "var(--md-sys-color-error)" : ACCENT.blue}
										label={dueLabel(t.transaction_date, today)}
										sx={{ minWidth: 104 }}
									/>
									<Box sx={{ flex: 1, minWidth: 160 }}>
										<Typography variant="body2" sx={{ fontWeight: 500 }}>
											{txTitle(t)}
										</Typography>
										<Stack
											direction="row"
											sx={{ alignItems: "center", gap: 0.5, flexWrap: "wrap" }}
										>
											<Typography variant="caption" sx={{ color: "text.secondary" }}>
												{formatWhen(t.transaction_date, t.transaction_time)}
												{t.subscription ? " · Subscription" : ""}
											</Typography>
											<TagChips tags={t.tags} />
										</Stack>
									</Box>
									<Typography variant="body2" sx={{ fontWeight: 600 }}>
										{SIGN[t.type]}
										{formatMoney(t.amount, t.currency)}
									</Typography>
									<Stack direction="row" sx={{ alignItems: "center" }}>
										<Button
											size="small"
											variant="outlined"
											color="inherit"
											startIcon={<CheckIcon fontSize="small" />}
											onClick={() => setPaying(t)}
										>
											Mark as paid
										</Button>
										<IconButton
											aria-label="Edit"
											title="Edit"
											size="small"
											onClick={() => onEdit(t)}
										>
											<EditOutlinedIcon fontSize="small" />
										</IconButton>
										<IconButton
											aria-label={t.subscription ? "Skip" : "Delete"}
											title={t.subscription ? "Skip this payment" : "Delete"}
											size="small"
											onClick={() => onDelete(t)}
										>
											<DeleteOutlineIcon fontSize="small" />
										</IconButton>
									</Stack>
								</Stack>
							);
						})}
					</Stack>
				</AccordionDetails>
			</Accordion>
			{paying && (
				<MarkPaidDialog
					transaction={paying}
					baseCurrency={baseCurrency}
					onPaid={salary.offer}
					onClose={() => setPaying(null)}
				/>
			)}
			<SalarySplitHost id={salary.id} onClose={salary.close} />
		</>
	);
}
