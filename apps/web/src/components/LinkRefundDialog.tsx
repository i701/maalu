import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { formatDate, formatMoney, sumDecimals } from "#/lib/format";
import { amountLeft, itemsToPick, refundLines, type RefundItem } from "#/lib/refund";
import { useSheet } from "#/lib/sheet";
import { txTitle } from "#/lib/tx-display";
import { useAction } from "#/lib/use-action";
import { listRefundCandidatesFn, updateTransactionFn } from "#/server/transactions";
import type { Transaction } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import RefundItems from "./RefundItems";
import SearchField from "./SearchField";

/** The facts of a purchase to pick: when, what it cost and how much is left to refund. */
function describe(p: Transaction): string {
	const left = amountLeft(p.amount, p.refunded_amount);
	return `${formatDate(p.transaction_date)} · ${formatMoney(p.amount, p.currency)} · ${formatMoney(left, p.currency)} left`;
}

/**
 * Turns income you already recorded into a refund of a purchase. It lists the purchases it could
 * be for (same currency, on or before it, with enough left, the most likely first: the same
 * amount, then the same vendor). The income keeps its own date, amount, account and notes, and
 * takes the purchase's category; for a purchase with items you say which items it gave back.
 */
export default function LinkRefundDialog({
	income,
	onClose,
}: {
	income: Transaction;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [found, setFound] = useState<Transaction[] | null>(null);
	const [chosen, setChosen] = useState<Transaction | null>(null);
	const [items, setItems] = useState<RefundItem[]>([]);
	const [failed, setFailed] = useState<string | null>(null);

	async function search(q: string) {
		const res = await listRefundCandidatesFn({ data: { id: income.id, q } });
		setFailed(res.ok ? null : res.error);
		setFound(res.ok ? res.data : []);
	}
	useEffect(() => {
		void search("");
		// the first look, when the dialog opens; later ones come from the search box
		// oxlint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function choose(id: string) {
		const purchase = found?.find((p) => p.id === id) ?? null;
		setChosen(purchase);
		setItems(purchase?.splits.length ? itemsToPick(purchase) : []);
	}

	const ticked = items.filter((i) => i.on);
	const itemsTotal = sumDecimals(ticked.map((i) => i.amount || "0"));
	const itemsAdd = items.length === 0 || itemsTotal === sumDecimals([income.amount]);
	const ready = chosen !== null && itemsAdd && (items.length === 0 || ticked.length > 0);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!chosen) return;
		const changes = {
			refund_of_id: chosen.id,
			...(items.length ? { splits: refundLines(items) } : {}),
		};
		if (await run(() => updateTransactionFn({ data: { id: income.id, changes } }))) {
			notify("Linked as a refund");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Link to a purchase"
			submitLabel="Link"
			error={error ?? failed}
			pending={pending}
			submitDisabled={!ready}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="sm"
		>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
				{txTitle(income)} · {formatDate(income.transaction_date)} ·{" "}
				{formatMoney(income.amount, income.currency)}. Choose the purchase this money was for. It
				then counts as spending given back, not as income.
			</Typography>
			<SearchField value="" placeholder="Search purchases" onChange={(q) => void search(q)} />
			<Stack sx={{ mt: 2, maxHeight: 300, overflowY: "auto" }}>
				{found === null && <Typography sx={{ color: "text.secondary" }}>Looking…</Typography>}
				{found?.length === 0 && (
					<Alert severity="info">
						No purchase fits: it has to be in {income.currency}, on or before this date, with at
						least this much left to refund.
					</Alert>
				)}
				<RadioGroup value={chosen?.id ?? ""} onChange={(_, id) => choose(id)}>
					{found?.map((p) => (
						<FormControlLabel
							key={p.id}
							value={p.id}
							control={<Radio size="small" />}
							label={
								<div>
									<Typography variant="body2" sx={{ fontWeight: 500 }}>
										{txTitle(p)}
									</Typography>
									{p.description && (
										<Typography variant="caption" sx={{ display: "block" }}>
											{p.description}
										</Typography>
									)}
									<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
										{describe(p)}
									</Typography>
								</div>
							}
						/>
					))}
				</RadioGroup>
			</Stack>
			{chosen && items.length > 0 && (
				<Stack sx={{ mt: 2, gap: 1 }}>
					<Typography variant="body2">
						This purchase has items: tick the ones this money was for.
					</Typography>
					<RefundItems
						items={items}
						currency={chosen.currency}
						locked={false}
						onChange={setItems}
					/>
					<Typography
						variant="caption"
						sx={{ color: itemsAdd ? "text.secondary" : "error.main" }}
						aria-live="polite"
					>
						The items add up to {formatMoney(itemsTotal, chosen.currency)}; the money that came back
						is {formatMoney(income.amount, income.currency)}.
					</Typography>
				</Stack>
			)}
		</FormDialog>
	);
}
