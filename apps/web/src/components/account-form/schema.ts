import type { Control } from "react-hook-form";
import { z } from "zod";
import { hasCreditLimit, spendableValue, statementDays } from "#/lib/accounts";
import { exchangeRate } from "#/server/transactions";
import { ACCOUNT_GROUPS, type Account } from "#/types/api";

const blank = (max: number) => z.string().trim().max(max);

/** The account form. A foreign account needs its rate; a credit card's two days go together. */
export const accountSchema = (baseCurrency: string) =>
	z
		.object({
			group: z.enum(ACCOUNT_GROUPS),
			name: z.string().trim().min(1, "Give the account a name").max(200),
			bank: blank(100),
			account_number: blank(80),
			opening_amount: z
				.string()
				.trim()
				.regex(/^(-?\d+(\.\d{1,4})?)?$/, "Enter an amount, like 1250.50 or -300"),
			currency: z.string().regex(/^[A-Z]{3}$/, "Choose a currency"),
			exchange_rate: z.string().trim(),
			auto_rate: z.boolean(),
			// checked below, only for the groups that show it
			credit_limit: z.string().trim(),
			statement_day: z.string(),
			due_day: z.string(),
			description: blank(1000),
			spendable: z.boolean().nullable(),
			exclude_from_stats: z.boolean(),
		})
		.superRefine((v, ctx) => {
			if (v.currency !== baseCurrency && !exchangeRate.safeParse(v.exchange_rate).success)
				ctx.addIssue({ code: "custom", path: ["exchange_rate"], message: "Enter the rate" });
			if (hasCreditLimit(v.group) && !/^(\d+(\.\d{1,4})?)?$/.test(v.credit_limit))
				ctx.addIssue({
					code: "custom",
					path: ["credit_limit"],
					message: "Enter a limit, like 10000",
				});
			if (v.group !== "card") return;
			const days = statementDays(v.statement_day, v.due_day);
			if (!days.ok) ctx.addIssue({ code: "custom", path: ["due_day"], message: days.error });
		});

type Schema = ReturnType<typeof accountSchema>;
export type AccountFormInput = z.input<Schema>;
export type AccountFormOutput = z.output<Schema>;
export type AccountFormControl = Control<AccountFormInput, unknown, AccountFormOutput>;

/** Where the form starts: the account's own values, or a new cash account in your currency. */
export function accountDefaults(
	account: Account | undefined,
	baseCurrency: string,
): AccountFormInput {
	return {
		group: account?.group ?? "cash",
		name: account?.name ?? "",
		bank: account?.bank ?? "",
		account_number: account?.account_number ?? "",
		opening_amount: account?.opening_amount ?? "",
		currency: account?.currency ?? baseCurrency,
		exchange_rate: account?.exchange_rate ?? "",
		auto_rate: account?.auto_rate ?? false,
		credit_limit: account?.credit_limit ?? "",
		statement_day: account?.statement_day?.toString() ?? "",
		due_day: account?.due_day?.toString() ?? "",
		description: account?.description ?? "",
		spendable: account?.spendable ?? null,
		exclude_from_stats: account?.exclude_from_stats ?? false,
	};
}

/** The checked values as the account the API is sent: blanks become none, and what a group or
 * currency does not have (a limit, statement days, a rate) is left out or cleared. */
export function accountRequest(v: AccountFormOutput, baseCurrency: string) {
	const foreign = v.currency !== baseCurrency;
	const days = v.group === "card" ? statementDays(v.statement_day, v.due_day) : null;
	return {
		group: v.group,
		name: v.name,
		opening_amount: v.opening_amount || "0",
		currency: v.currency,
		exchange_rate: foreign ? v.exchange_rate : undefined,
		description: v.description || null,
		// only cards and overdrafts have one; empty means none
		credit_limit: hasCreditLimit(v.group) ? v.credit_limit || null : null,
		// credit cards only; both or neither
		statement_day: days?.ok ? days.statement_day : null,
		due_day: days?.ok ? days.due_day : null,
		exclude_from_stats: v.exclude_from_stats,
		spendable: spendableValue(v.spendable, v.group),
		// only a foreign-currency account has a rate to keep up to date
		auto_rate: foreign && v.auto_rate,
		bank: v.bank || null,
		account_number: v.account_number || null,
	};
}
