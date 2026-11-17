import { z } from "zod";
import { exchangeRate, positiveAmount, timeOfDay } from "#/server/transactions";

const refundItem = z.object({
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
			.refine((items) => !hasItems || items.some((i) => i.on), "Choose at least one item"),
		transaction_date: z.iso.date("Choose a date"),
		transaction_time: timeOfDay.or(z.literal("")),
		account_id: z.string(),
		exchange_rate: foreign ? exchangeRate : z.string(),
		description: z.string().trim(),
	});

type Schema = ReturnType<typeof refundSchema>;
export type RefundFormInput = z.input<Schema>;
export type RefundFormOutput = z.output<Schema>;
