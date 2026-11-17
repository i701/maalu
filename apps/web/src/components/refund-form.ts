import { z } from "zod";
import { formatTime, trimRate } from "#/lib/format";
import { localToday } from "#/lib/planned";
import { itemsOfRefund, itemsToPick, refundLines } from "#/lib/refund";
import { exchangeRate, positiveAmount, timeOfDay } from "#/server/transactions";
import type { Account, Transaction } from "#/types/api";

/** One item of a purchase to refund, as `RefundItems` edits it. */
export const refundItem = z.object({
	id: z.string(),
	name: z.string(),
	category: z.string(),
	left: z.string(),
	amount: z.string(),
	on: z.boolean(),
});

/** The refund dialog's fields. A purchase with items is refunded item by item (the amount is their
 * total), and a refund in another currency than yours needs its rate. */
export const refundSchema = (hasItems: boolean, foreign: boolean) =>
	z.object({
		amount: hasItems ? z.string() : positiveAmount,
		items: z
			.array(refundItem)
			.refine((items) => !hasItems || items.some((i) => i.on), "Choose at least one item")
			.superRefine((items, ctx) => {
				items.forEach((item, i) => {
					if (item.on && !positiveAmount.safeParse(item.amount).success)
						ctx.addIssue({ code: "custom", path: [i, "amount"], message: "Enter an amount" });
				});
			}),
		transaction_date: z.iso.date("Choose a date"),
		transaction_time: timeOfDay.or(z.literal("")),
		account_id: z.string(),
		exchange_rate: foreign ? exchangeRate : z.string(),
		description: z.string().trim(),
	});

type Schema = ReturnType<typeof refundSchema>;
export type RefundFormInput = z.input<Schema>;
export type RefundFormOutput = z.output<Schema>;

/** Where the refund dialog starts: the refund's own values, or what is left of the purchase. The
 * account is kept only when it is one of those offered (in the refund's currency). */
export function refundDefaults({
	purchase,
	refund,
	accounts,
	left,
	hasItems,
}: {
	purchase?: Transaction;
	refund?: Transaction;
	/** The accounts offered. */
	accounts: Account[];
	/** What is left to refund of the purchase. */
	left?: string;
	hasItems: boolean;
}): RefundFormInput {
	const source = refund ?? purchase;
	const accountId = source?.account?.id ?? "";
	return {
		amount: refund?.amount ?? left ?? "",
		items: refund ? itemsOfRefund(refund) : purchase && hasItems ? itemsToPick(purchase) : [],
		transaction_date: refund?.transaction_date ?? localToday(),
		transaction_time: formatTime(refund?.transaction_time ?? null) ?? "",
		account_id: accounts.some((a) => a.id === accountId) ? accountId : "",
		exchange_rate: trimRate(source?.exchange_rate ?? ""),
		description: refund?.description ?? "",
	};
}

/** What a new refund and a changed one both send: with items, the amount is their total. */
export function refundFields(
	v: RefundFormOutput,
	{ total, foreign, hasItems }: { total: string | null; foreign: boolean; hasItems: boolean },
) {
	return {
		amount: total ?? v.amount,
		transaction_date: v.transaction_date,
		transaction_time: v.transaction_time || null,
		...(foreign ? { exchange_rate: v.exchange_rate } : {}),
		...(hasItems ? { splits: refundLines(v.items) } : {}),
	};
}
