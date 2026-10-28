import { describe, expect, it } from "vitest";
import type { Transaction, TransactionTemplate } from "#/types/api";
import {
	buildTemplateRequest,
	initialValues,
	seedAfterSave,
	seedFromTemplate,
	seedFromTransaction,
} from "./request";

const template: TransactionTemplate = {
	id: "t1",
	name: "Weekly fish box",
	type: "expense",
	amount: "120.0000",
	currency: "MVR",
	payment_method: "cash",
	category: "Groceries",
	vendor: "Male Fish Market",
	description: "Fish",
	account: null,
	to_account: null,
	tags: [{ id: "g1", name: "Food", color: "blue" }],
	created_at: "2026-03-01T00:00:00Z",
};

describe("seedFromTemplate", () => {
	it("fills in the saved details with a tidy amount and no rate", () => {
		const seed = seedFromTemplate(template);
		expect(seed).toMatchObject({
			type: "expense",
			amount: "120",
			category: "Groceries",
			vendorName: "Male Fish Market",
			tags: ["Food"],
			payment_method: "cash",
			exchange_rate: "",
			splits: [],
		});
	});

	it("leaves the amount empty when the template has none", () => {
		expect(seedFromTemplate({ ...template, amount: null }).amount).toBe("");
	});

	it("keeps a decimal that is not a trailing zero", () => {
		expect(seedFromTemplate({ ...template, amount: "12.5000" }).amount).toBe("12.5");
		expect(seedFromTemplate({ ...template, amount: "100.0000" }).amount).toBe("100");
		expect(seedFromTemplate({ ...template, amount: "100" }).amount).toBe("100");
	});
});

describe("seedFromTransaction", () => {
	it("copies the details but not the old exchange rate", () => {
		const t = {
			type: "expense",
			amount: "30.5000",
			to_amount: null,
			payment_method: "credit_card",
			category: "Fuel",
			description: "Top up",
			splits: [],
			currency: "USD",
			exchange_rate: "15.4",
			subscription: null,
			account: null,
			to_account: null,
			tags: [{ id: "g1", name: "Trip", color: "blue" }],
			vendor: { name: "Shell" },
		} as unknown as Transaction;
		const seed = seedFromTransaction(t);
		expect(seed.exchange_rate).toBe("");
		expect(seed.amount).toBe("30.5");
		expect(seed.vendorName).toBe("Shell");
		expect(seed.currency).toBe("USD");
		expect(seed.tags).toEqual(["Trip"]);
	});
});

const form = (values: Record<string, string>) => {
	const f = new FormData();
	for (const [k, v] of Object.entries(values)) f.set(k, v);
	return f;
};
const state = (over: object) =>
	({
		type: "expense",
		accountId: "",
		toAccountId: "",
		account: null,
		toAccount: null,
		crossCurrency: false,
		foreign: false,
		subscription: null,
		splits: null,
		...over,
	}) as Parameters<typeof buildTemplateRequest>[1];

describe("buildTemplateRequest", () => {
	it("saves what was typed and leaves out what was not", () => {
		const built = buildTemplateRequest(
			form({
				amount: "",
				category: "Coffee",
				vendor: "",
				description: "",
				currency: "MVR",
				payment_method: "cash",
			}),
			state({}),
			"Coffee",
		);
		expect(built).toEqual({
			draft: {
				name: "Coffee",
				type: "expense",
				amount: undefined,
				payment_method: "cash",
				category: "Coffee",
				currency: "MVR",
			},
		});
	});

	it("uses the account instead of a currency", () => {
		const built = buildTemplateRequest(
			form({ amount: "5", category: "x", payment_method: "cash", currency: "MVR" }),
			state({ accountId: "acc-1" }),
			"x",
		);
		expect(built).toMatchObject({ draft: { account_id: "acc-1", amount: "5" } });
		expect(built).not.toHaveProperty("draft.currency");
	});

	it("needs both accounts for a transfer", () => {
		expect(
			buildTemplateRequest(form({ amount: "5" }), state({ type: "transfer", accountId: "a" }), "t"),
		).toHaveProperty("error");
		expect(
			buildTemplateRequest(
				form({ amount: "5", category: "ignored", vendor: "ignored" }),
				state({ type: "transfer", accountId: "a", toAccountId: "b" }),
				"t",
			),
		).toEqual({
			draft: { name: "t", type: "transfer", amount: "5", account_id: "a", to_account_id: "b" },
		});
	});
});

const withTags = (...tags: string[]) => {
	const f = new FormData();
	f.set("category", "Misc");
	f.set("payment_method", "cash");
	f.set("currency", "MVR");
	for (const t of tags) f.append("tags", t);
	return f;
};

describe("tags", () => {
	const expenseState = {
		type: "expense",
		accountId: "",
		toAccountId: "",
		account: null,
		toAccount: null,
		crossCurrency: false,
		foreign: false,
		subscription: null,
		splits: null,
	} as Parameters<typeof buildTemplateRequest>[1];

	it("saves every typed tag on a template, and none when there are none", () => {
		expect(buildTemplateRequest(withTags("Trip", "Need"), expenseState, "t")).toMatchObject({
			draft: { tags: ["Trip", "Need"] },
		});
		expect(buildTemplateRequest(withTags(), expenseState, "t")).not.toHaveProperty("draft.tags");
	});

	it("keeps the tags for the next entry after Add another", () => {
		expect(seedAfterSave(withTags("Trip"), expenseState).tags).toEqual(["Trip"]);
	});

	it("starts a template-based entry with the template's tags", () => {
		const seed = seedFromTemplate({
			...template,
			tags: [{ id: "1", name: "Trip", color: "blue" }],
		});
		expect(seed.tags).toEqual(["Trip"]);
	});
});

describe("initialValues", () => {
	const card = { id: "acc-1", name: "Visa", group: "card", currency: "USD" } as const;

	it("starts a new transaction in the default account, with its currency and method", () => {
		expect(initialValues(undefined, "MVR", card)).toMatchObject({
			type: "expense",
			accountId: "acc-1",
			currency: "USD",
			paymentMethod: "credit_card",
		});
	});

	it("starts empty without a default account", () => {
		expect(initialValues(undefined, "MVR")).toMatchObject({
			accountId: "",
			currency: "MVR",
			paymentMethod: "cash",
		});
	});

	it("never overrides what a seed says", () => {
		const seed = seedFromTemplate({ ...template, account: null, currency: "MVR" });
		expect(initialValues(seed, "MVR", card)).toMatchObject({ accountId: "", currency: "MVR" });
	});
});
