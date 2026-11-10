import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { memo, useState } from "react";
import { formatDate, formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import {
	amountPrefix,
	candidateKey,
	confidenceText,
	everyText,
} from "#/lib/subscription-candidates";
import { useAction } from "#/lib/use-action";
import { dismissSubscriptionCandidateFn } from "#/server/subscriptions";
import type { SubscriptionCandidate } from "#/types/api";
import AcceptSuggestionDialog from "./AcceptSuggestionDialog";
import TonalChip from "./TonalChip";

/** Charges that repeat in what you have already paid (the same vendor, the same rhythm, a similar
 * amount) and are not a subscription yet. Adding one links those payments and plans the next;
 * "Not a subscription" stops it being suggested again. Nothing is made until you press Add.
 * Closed by default, like the other suggestion cards. */
const SubscriptionSuggestionsCard = memo(function SubscriptionSuggestionsCard({
	candidates,
}: {
	candidates: SubscriptionCandidate[];
}) {
	const { run, pending, error } = useAction();
	const [accepting, setAccepting] = useState<SubscriptionCandidate | null>(null);
	if (candidates.length === 0) return null;

	return (
		<>
			<Accordion
				disableGutters
				elevation={0}
				square
				aria-label="Suggested subscriptions"
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
							Suggested subscriptions
						</Typography>
						<TonalChip accent={ACCENT.green} label={String(candidates.length)} />
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							Charges that repeat in what you have paid
						</Typography>
					</Stack>
				</AccordionSummary>
				<AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
					<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
						Adding one links the payments you already made and plans the next, so it shows in the
						month plan and reminds you before it is due.
					</Typography>
					{error && (
						<Alert severity="error" sx={{ mb: 1 }}>
							{error}
						</Alert>
					)}
					<Stack sx={{ gap: 1 }}>
						{candidates.map((c) => (
							<Stack
								key={candidateKey(c)}
								direction="row"
								sx={{ alignItems: "center", gap: 1.5, flexWrap: "wrap", py: 0.75 }}
							>
								<Stack sx={{ flex: 1, minWidth: 220 }}>
									<Typography variant="body2" sx={{ fontWeight: 500 }}>
										{c.vendor_name}
									</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										{amountPrefix(c)}
										{formatMoney(c.amount, c.currency)}{" "}
										{everyText(c.interval_unit, c.interval_count)} · seen {c.occurrences} times,
										last {formatDate(c.last_date)}
									</Typography>
								</Stack>
								<TonalChip
									accent={c.confidence === "high" ? ACCENT.green : ACCENT.slate}
									label={confidenceText(c)}
								/>
								<Stack direction="row" sx={{ gap: 0.5 }}>
									<Button
										size="small"
										variant="outlined"
										color="inherit"
										disabled={pending}
										onClick={() => setAccepting(c)}
									>
										Add
									</Button>
									<Button
										size="small"
										color="inherit"
										disabled={pending}
										onClick={() =>
											void run(() =>
												dismissSubscriptionCandidateFn({
													data: { vendor_id: c.vendor_id, currency: c.currency },
												}),
											)
										}
									>
										Not a subscription
									</Button>
								</Stack>
							</Stack>
						))}
					</Stack>
				</AccordionDetails>
			</Accordion>
			{accepting && (
				<AcceptSuggestionDialog candidate={accepting} onClose={() => setAccepting(null)} />
			)}
		</>
	);
});

export default SubscriptionSuggestionsCard;
