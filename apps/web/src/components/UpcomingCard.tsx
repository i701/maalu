import CheckIcon from "@mui/icons-material/Check";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
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
import { TagChips } from "./TagChip";
import TonalChip from "./TonalChip";

const SIGN = { income: "+", expense: "−", transfer: "" } as const;

/** The planned transactions, soonest first, with a one-click "Mark as paid". They count toward
 * nothing until then; ones whose day has passed say how late they are. */
export default function UpcomingCard({
	items,
	onEdit,
	onDelete,
}: {
	items: Transaction[];
	onEdit: (t: Transaction) => void;
	onDelete: (t: Transaction) => void;
}) {
	const [paying, setPaying] = useState<Transaction | null>(null);
	const today = localToday();
	if (items.length === 0) return null;

	return (
		<>
			<Box
				component="section"
				aria-label="Upcoming transactions"
				sx={{
					mb: 2,
					p: 2,
					borderRadius: "var(--shape-xl)",
					bgcolor: "var(--md-sys-color-surface-container-low)",
				}}
			>
				<Stack direction="row" sx={{ alignItems: "baseline", gap: 1, mb: 1 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						Upcoming
					</Typography>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						Planned, not counted until you mark them paid
					</Typography>
				</Stack>
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
									<Stack direction="row" sx={{ alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
										<Typography variant="caption" sx={{ color: "text.secondary" }}>
											{formatWhen(t.transaction_date, t.transaction_time)}
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
									<IconButton aria-label="Edit" title="Edit" size="small" onClick={() => onEdit(t)}>
										<EditOutlinedIcon fontSize="small" />
									</IconButton>
									<IconButton
										aria-label="Delete"
										title="Delete"
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
			</Box>
			{paying && <MarkPaidDialog transaction={paying} onClose={() => setPaying(null)} />}
		</>
	);
}
