import Typography from "@mui/material/Typography";
import { type FormEvent, useState } from "react";
import { sumDecimals } from "#/lib/format";
import {
	amountLeft,
	itemsOfRefund,
	itemsToPick,
	refundContext,
	refundLines,
	type RefundItem,
} from "#/lib/refund";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createTransactionFn, updateTransactionFn } from "#/server/transactions";
import type { Account, Transaction } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import RefundAmount from "./RefundAmount";
import RefundDetails from "./RefundDetails";

const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();

/**
 * Giving money back for a purchase: pass the `purchase` for a new refund, or the `refund` to change
 * one. A refund is in the purchase's currency and category (taken off that spending), and can be up
 * to what is left of it; with items it is refunded item by item.
 */
export default function RefundDialog({
	purchase,
	refund,
	accounts,
	baseCurrency,
	onClose,
}: {
	purchase?: Transaction;
	refund?: Transaction;
	/** Accounts not archived; only those in the refund's currency are offered. */
	accounts: Account[];
	baseCurrency: string;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [localError, setLocalError] = useState<string | null>(null);

	const source = refund ?? purchase;
	const currency = source?.currency ?? baseCurrency;
	const usable = accounts.filter((a) => a.currency === currency);
	const [accountId, setAccountId] = useState(() =>
		usable.some((a) => a.id === source?.account?.id) ? (source?.account?.id ?? "") : "",
	);
	const hasItems = Boolean(source?.splits.length);
	const [items, setItems] = useState<RefundItem[]>(() => {
		if (refund) return itemsOfRefund(refund);
		return purchase && hasItems ? itemsToPick(purchase) : [];
	});
	const ticked = items.filter((i) => i.on);
	const total = hasItems ? sumDecimals(ticked.map((i) => i.amount || "0")) : null;
	const left = purchase ? amountLeft(purchase.amount, purchase.refunded_amount) : undefined;

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		if (hasItems && ticked.length === 0) return setLocalError("Choose at least one item");
		setLocalError(null);
		const fields = {
			amount: total ?? text(f, "amount"),
			transaction_date: text(f, "transaction_date"),
			transaction_time: text(f, "transaction_time") || null,
			...(currency === baseCurrency ? {} : { exchange_rate: text(f, "exchange_rate") }),
			...(hasItems ? { splits: refundLines(items) } : {}),
		};
		const description = text(f, "description");
		const send = () =>
			refund
				? updateTransactionFn({
						data: {
							id: refund.id,
							changes: {
								...fields,
								description: description || null,
								account_id: accountId || null,
							},
						},
					})
				: createTransactionFn({
						data: {
							type: "income",
							refund_of_id: purchase?.id,
							...fields,
							description: description || undefined,
							account_id: accountId || undefined,
						},
					});
		if (await run(send)) {
			notify(refund ? "Refund updated" : "Refund added");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={refund ? "Edit refund" : "Refund a purchase"}
			submitLabel={refund ? "Save" : "Refund"}
			error={localError ?? error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
				{refundContext(purchase, refund)}
			</Typography>
			<RefundAmount
				items={items}
				total={total}
				currency={currency}
				defaultAmount={refund?.amount ?? left ?? ""}
				left={left}
				locked={Boolean(refund)}
				onItems={setItems}
			/>
			<RefundDetails
				refund={refund}
				rate={source?.exchange_rate ?? ""}
				currency={currency}
				baseCurrency={baseCurrency}
				accounts={usable}
				accountId={accountId}
				onAccount={setAccountId}
			/>
		</FormDialog>
	);
}
