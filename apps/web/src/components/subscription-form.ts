import { z } from "zod";
import { exchangeRate } from "#/server/transactions";
import { repeatFields, subscriptionFormFields } from "#/server/subscriptions";
import { PAYMENT_METHODS, SUBSCRIPTION_STATUSES } from "#/types/api";

/** The subscription form's fields. Without an account a payment in another currency than yours
 * needs a currency code and its rate; with one, the account's currency and rate are used. */
export const subscriptionSchema = (baseCurrency: string) =>
	z
		.object({
			...subscriptionFormFields,
			...repeatFields,
			account_id: z.string(),
			currency: z.string().trim(),
			exchange_rate: z.string().trim(),
			payment_method: z.enum(PAYMENT_METHODS),
			category: z.string().trim().min(1, "Choose a category").max(100),
			vendor: z.string().trim().max(200),
			start_date: z.iso.date("Choose the first billing date"),
			status: z.enum(SUBSCRIPTION_STATUSES),
			installments_total: z
				.string()
				.trim()
				.regex(/^\d*$/, "A whole number of payments")
				.refine((v) => v === "" || (Number(v) >= 1 && Number(v) <= 600), "Between 1 and 600"),
			remind_days_before: z.string(),
			amount_varies: z.boolean(),
		})
		.superRefine((v, ctx) => {
			if (v.account_id) return;
			if (!/^[A-Za-z]{3}$/.test(v.currency)) {
				ctx.addIssue({
					code: "custom",
					path: ["currency"],
					message: "Use a 3-letter currency code",
				});
				return;
			}
			if (
				v.currency.toUpperCase() !== baseCurrency &&
				!exchangeRate.safeParse(v.exchange_rate).success
			)
				ctx.addIssue({ code: "custom", path: ["exchange_rate"], message: "Enter the rate" });
		});

type Schema = ReturnType<typeof subscriptionSchema>;
export type SubscriptionFormInput = z.input<Schema>;
export type SubscriptionFormOutput = z.output<Schema>;
