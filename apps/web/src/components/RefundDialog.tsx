import { zodResolver } from "@hookform/resolvers/zod";
import Typography from "@mui/material/Typography";
import { useForm, useWatch } from "react-hook-form";
import { formatTime, sumDecimals, trimRate } from "#/lib/format";
import { localToday } from "#/lib/planned";
import { amountLeft, itemsOfRefund, itemsToPick, refundContext, refundLines } from "#/lib/refund";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createTransactionFn, updateTransactionFn } from "#/server/transactions";
import type { Account, Transaction } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import RefundAmount from "./RefundAmount";
import RefundDetails from "./RefundDetails";
import { type RefundFormInput, type RefundFormOutput, refundSchema } from "./refund-form";

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

	const source = refund ?? purchase;
	const currency = source?.currency ?? baseCurrency;
	const foreign = currency !== baseCurrency;
	const usable = accounts.filter((a) => a.currency === currency);
	const hasItems = Boolean(source?.splits.length);
	const left = purchase ? amountLeft(purchase.amount, purchase.refunded_amount) : undefined;

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<RefundFormInput, unknown, RefundFormOutput>({
		resolver: zodResolver(refundSchema(hasItems, foreign)),
		defaultValues: {
			amount: refund?.amount ?? left ?? "",
			items: refund ? itemsOfRefund(refund) : purchase && hasItems ? itemsToPick(purchase) : [],
			transaction_date: refund?.transaction_date ?? localToday(),
			transaction_time: formatTime(refund?.transaction_time ?? null) ?? "",
			account_id: usable.some((a) => a.id === source?.account?.id)
				? (source?.account?.id ?? "")
				: "",
			exchange_rate: trimRate(source?.exchange_rate ?? ""),
			description: refund?.description ?? "",
		},
	});
	const items = useWatch({ control, name: "items" });
	const total = hasItems
		? sumDecimals(items.filter((i) => i.on).map((i) => i.amount || "0"))
		: null;

	async function submit(v: RefundFormOutput) {
		const fields = {
			amount: total ?? v.amount,
			transaction_date: v.transaction_date,
			transaction_time: v.transaction_time || null,
			...(foreign ? { exchange_rate: v.exchange_rate } : {}),
			...(hasItems ? { splits: refundLines(v.items) } : {}),
		};
		const send = () =>
			refund
				? updateTransactionFn({
						data: {
							id: refund.id,
							changes: {
								...fields,
								description: v.description || null,
								account_id: v.account_id || null,
							},
						},
					})
				: createTransactionFn({
						data: {
							type: "income",
							refund_of_id: purchase?.id,
							...fields,
							description: v.description || undefined,
							account_id: v.account_id || undefined,
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
			error={errors.items?.message ?? error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			noValidate
			sheet={sheet}
			maxWidth="xs"
		>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
				{refundContext(purchase, refund)}
			</Typography>
			<RefundAmount
				control={control}
				total={total}
				currency={currency}
				left={left}
				locked={Boolean(refund)}
			/>
			<RefundDetails
				control={control}
				currency={currency}
				baseCurrency={baseCurrency}
				accounts={usable}
			/>
		</FormDialog>
	);
}
