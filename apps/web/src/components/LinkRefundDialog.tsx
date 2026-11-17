import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import Money from "#/components/Money";
import { formatDate, formatMoney, sumDecimals } from "#/lib/format";
import { amountLeft, itemsToPick, refundLines } from "#/lib/refund";
import { useSheet } from "#/lib/sheet";
import { txTitle } from "#/lib/tx-display";
import { useAction } from "#/lib/use-action";
import { listRefundCandidatesFn, updateTransactionFn } from "#/server/transactions";
import type { Transaction } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import { refundItem } from "./refund-form";
import RefundItems from "./RefundItems";
import SearchField from "./SearchField";

/** A purchase must be chosen; when it has items, the ticked ones must add up to the money back. */
const linkSchema = (amount: string) =>
	z
		.object({ purchase_id: z.string().min(1, "Choose the purchase"), items: z.array(refundItem) })
		.superRefine(({ items }, ctx) => {
			if (items.length === 0) return;
			const ticked = items.filter((i) => i.on);
			if (ticked.length === 0)
				ctx.addIssue({ code: "custom", path: ["items"], message: "Tick the items it was for" });
			else if (sumDecimals(ticked.map((i) => i.amount || "0")) !== sumDecimals([amount]))
				ctx.addIssue({
					code: "custom",
					path: ["items"],
					message: "The ticked items must add up to the money that came back",
				});
		});

/** The facts of a purchase to pick: when, what it cost and how much is left to refund. */
function describeTransaction(p: Transaction): string {
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
	// The chosen purchase as found, kept while later searches show other ones.
	const [chosen, setChosen] = useState<Transaction | null>(null);
	const {
		control,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(linkSchema(income.amount)),
		defaultValues: { purchase_id: "", items: [] },
	});
	const items = useWatch({ control, name: "items" });
	const [failed, setFailed] = useState<string | null>(null);

	const search = useCallback(
		async (q: string) => {
			const res = await listRefundCandidatesFn({ data: { id: income.id, q } });
			setFailed(res.ok ? null : res.error);
			setFound(res.ok ? res.data : []);
		},
		[income.id],
	);

	useEffect(() => {
		void search("");
		// the first look, when the dialog opens; later ones come from the search box
		// oxlint-disable-next-line react-hooks/exhaustive-deps
	}, [search]);

	function choose(id: string) {
		const purchase = found?.find((p) => p.id === id) ?? null;
		setChosen(purchase);
		setValue("purchase_id", purchase?.id ?? "");
		setValue("items", purchase?.splits.length ? itemsToPick(purchase) : []);
	}

	const ticked = items.filter((i) => i.on);
	const itemsTotal = sumDecimals(ticked.map((i) => i.amount || "0"));
	const itemsAdd = items.length === 0 || itemsTotal === sumDecimals([income.amount]);
	const ready = chosen !== null && itemsAdd && (items.length === 0 || ticked.length > 0);

	async function submit(v: z.output<ReturnType<typeof linkSchema>>) {
		const changes = {
			refund_of_id: v.purchase_id,
			...(v.items.length ? { splits: refundLines(v.items) } : {}),
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
			error={error ?? failed ?? errors.purchase_id?.message ?? errors.items?.message ?? null}
			pending={pending}
			submitDisabled={!ready}
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="sm"
		>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
				{txTitle(income)} · {formatDate(income.transaction_date)} ·{" "}
				<Money amount={income.amount} currency={income.currency} />. Choose the purchase this money
				was for. It then counts as spending given back, not as income.
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
										{describeTransaction(p)}
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
					<Controller
						name="items"
						control={control}
						render={({ field }) => (
							<RefundItems
								items={field.value}
								currency={chosen.currency}
								locked={false}
								onChange={field.onChange}
							/>
						)}
					/>
					<Typography
						variant="caption"
						sx={{ color: itemsAdd ? "text.secondary" : "error.main" }}
						aria-live="polite"
					>
						The items add up to <Money amount={itemsTotal} currency={chosen.currency} />; the money
						that came back is <Money amount={income.amount} currency={income.currency} />.
					</Typography>
				</Stack>
			)}
		</FormDialog>
	);
}
