import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Money from "#/components/Money";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { formatDate } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { daysApartText } from "#/lib/transfer-link";
import { useAction } from "#/lib/use-action";
import { dismissTransferSuggestionFn, linkTransferFn } from "#/server/transactions";
import type { Transaction, TransferSuggestion } from "#/types/api";
import { useNotify } from "./Notify";
import TonalChip from "./TonalChip";

function Side({ t, sign }: { t: Transaction; sign: "−" | "+" }) {
	return (
		<Box sx={{ minWidth: 0, flex: 1 }}>
			<Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
				{t.account?.name ?? "No account"}
			</Typography>
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				{sign}
				<Money amount={t.amount} currency={t.currency} /> · {formatDate(t.transaction_date)}
			</Typography>
		</Box>
	);
}

/** Pairs that look like one move of your own money, entered twice (an expense in one account and an
 * income of the same amount in another, a day or two apart). Merging makes them one transfer, so
 * neither counts as spending or income. Nothing happens until you press Merge; "Not a pair" stops a
 * pair being suggested again. Closed by default, like the Upcoming card. */
const TransferSuggestionsCard = memo(function TransferSuggestionsCard({
	suggestions,
}: {
	suggestions: TransferSuggestion[];
}) {
	const { run, pending, error } = useAction();
	const notify = useNotify();
	if (suggestions.length === 0) return null;

	async function merge(s: TransferSuggestion) {
		const pair = { expense_id: s.expense.id, income_id: s.income.id };
		if (await run(() => linkTransferFn({ data: pair })))
			notify("Made one transfer. The other entry is in the trash");
	}

	return (
		<Accordion
			disableGutters
			elevation={0}
			square
			aria-label="Possible transfers"
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
						Possible transfers
					</Typography>
					<TonalChip accent={ACCENT.blue} label={String(suggestions.length)} />
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						Moves of your own money that were entered twice
					</Typography>
				</Stack>
			</AccordionSummary>
			<AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
					Each pair counts as spending and as income, although you only moved money between your
					accounts. Merge makes it one transfer: balances stay as they are and the reports stop
					counting it.
				</Typography>
				{error && (
					<Alert severity="error" sx={{ mb: 1 }}>
						{error}
					</Alert>
				)}
				<Stack sx={{ gap: 1 }}>
					{suggestions.map((s) => (
						<Stack
							key={`${s.expense.id}-${s.income.id}`}
							direction="row"
							sx={{ alignItems: "center", gap: 1.5, flexWrap: "wrap", py: 0.75 }}
						>
							<Stack direction="row" sx={{ alignItems: "center", gap: 1, flex: 1, minWidth: 260 }}>
								<Side t={s.expense} sign="−" />
								<SwapHorizIcon fontSize="small" sx={{ color: "text.secondary", flexShrink: 0 }} />
								<Side t={s.income} sign="+" />
							</Stack>
							<TonalChip accent={ACCENT.slate} label={daysApartText(s.days_apart)} />
							<Stack direction="row" sx={{ gap: 0.5 }}>
								<Button
									size="small"
									variant="outlined"
									color="inherit"
									disabled={pending}
									onClick={() => void merge(s)}
								>
									Merge
								</Button>
								<Button
									size="small"
									color="inherit"
									disabled={pending}
									onClick={() =>
										void run(() =>
											dismissTransferSuggestionFn({
												data: { expense_id: s.expense.id, income_id: s.income.id },
											}),
										)
									}
								>
									Not a pair
								</Button>
							</Stack>
						</Stack>
					))}
				</Stack>
			</AccordionDetails>
		</Accordion>
	);
});

export default TransferSuggestionsCard;
