import { describe, expect, it } from "vitest";
import { withDefaults } from "#/lib/utils";
import { accountRef, makeTransaction, makeVendor } from "#/test/fixtures";
import type { TransactionTemplate } from "#/types/api";
import {
	buildTemplateRequest,
	seedAfterSave,
	seedFromTemplate,
	seedFromTransaction,
	type State,
} from "./request";
import { initialValues, transactionSchema, type TxValues } from "./schema";

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
		const t = makeTransaction({
			amount: "30.5000",
			payment_method: "credit_card",
			category: "Fuel",
			description: "Top up",
			currency: "USD",
			exchange_rate: "15.4",
			account: null,
			tags: [{ id: "g1", name: "Trip", color: "blue" }],
			vendor: makeVendor("Shell"),
		});
		const seed = seedFromTransaction(t);
		expect(seed.exchange_rate).toBe("");
		expect(seed.amount).toBe("30.5");
		expect(seed.vendorName).toBe("Shell");
		expect(seed.currency).toBe("USD");
		expect(seed.tags).toEqual(["Trip"]);
	});
});

// What a new, empty form holds; each test changes only what it is about.
const values = (over: Partial<TxValues> = {}): TxValues =>
	withDefaults(initialValues({ seed: undefined, baseCurrency: "MVR" }), over);
const lookups: State = {
	account: null,
	card: null,
	toAccount: null,
	crossCurrency: false,
	foreign: false,
	splits: null,
};

describe("buildTemplateRequest", () => {
	it("saves what was typed and leaves out what was not", () => {
		const built = buildTemplateRequest(values({ category: "Coffee" }), lookups, "Coffee");
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
			values({ amount: "5", category: "x", account_id: "acc-1" }),
			lookups,
			"x",
		);
		expect(built).toMatchObject({ draft: { account_id: "acc-1", amount: "5" } });
		expect(built).not.toHaveProperty("draft.currency");
	});

	it("needs both accounts for a transfer", () => {
		expect(
			buildTemplateRequest(
				values({ amount: "5", type: "transfer", account_id: "a" }),
				lookups,
				"t",
			),
		).toHaveProperty("error");
		expect(
			buildTemplateRequest(
				values({
					amount: "5",
					category: "ignored",
					vendor: "ignored",
					type: "transfer",
					account_id: "a",
					to_account_id: "b",
				}),
				lookups,
				"t",
			),
		).toEqual({
			draft: { name: "t", type: "transfer", amount: "5", account_id: "a", to_account_id: "b" },
		});
	});
});

const withTags = (...tags: string[]) => values({ category: "Misc", tags });

describe("tags", () => {
	it("saves every typed tag on a template, and none when there are none", () => {
		expect(buildTemplateRequest(withTags("Trip", "Need"), lookups, "t")).toMatchObject({
			draft: { tags: ["Trip", "Need"] },
		});
		expect(buildTemplateRequest(withTags(), lookups, "t")).not.toHaveProperty("draft.tags");
	});

	it("keeps the tags for the next entry after Add another", () => {
		expect(seedAfterSave(withTags("Trip"), lookups).tags).toEqual(["Trip"]);
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
	const card = accountRef("acc-1", { name: "Visa", group: "card", currency: "USD" });

	it("starts a new transaction in the default account, with its currency and method", () => {
		expect(
			initialValues({ seed: undefined, baseCurrency: "MVR", defaultAccount: card }),
		).toMatchObject({
			type: "expense",
			account_id: "acc-1",
			currency: "USD",
			payment_method: "credit_card",
		});
	});

	it("starts empty without a default account", () => {
		expect(initialValues({ seed: undefined, baseCurrency: "MVR" })).toMatchObject({
			account_id: "",
			currency: "MVR",
			payment_method: "cash",
		});
	});

	it("never overrides what a seed says", () => {
		const seed = seedFromTemplate({ ...template, account: null, currency: "MVR" });
		expect(initialValues({ seed, baseCurrency: "MVR", defaultAccount: card })).toMatchObject({
			account_id: "",
			currency: "MVR",
		});
	});

	it("keeps the saved rate when editing, and leaves it to the market rate for a duplicate", () => {
		const t = makeTransaction({ currency: "USD", exchange_rate: "15.42000000" });
		const seed = seedFromTransaction(t);
		expect(initialValues({ seed, transaction: t, baseCurrency: "MVR" }).exchange_rate).toBe(
			"15.42",
		);
		expect(initialValues({ seed, baseCurrency: "MVR" }).exchange_rate).toBe("");
	});
});

describe("transactionSchema", () => {
	const bml = accountRef("bml");
	const usd = accountRef("usd", { currency: "USD" });
	const check = (v: TxValues, items = false) =>
		transactionSchema({ baseCurrency: "MVR", accounts: [bml, usd], items }).safeParse(v);
	const problems = (v: TxValues, items = false) => {
		const result = check(v, items);
		return result.success
			? []
			: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
	};

	it("accepts a plain expense", () => {
		expect(problems(values({ amount: "12.50", category: "Food" }))).toEqual([]);
	});

	it("needs an amount and a category unless the items give them", () => {
		expect(problems(values())).toEqual([
			"amount: Enter the amount, like 12.50",
			"category: Choose a category",
		]);
		expect(problems(values(), true)).toEqual([]);
	});

	it("needs a rate for another currency than yours", () => {
		const foreign = values({ amount: "5", category: "Food", account_id: "usd" });
		expect(problems(foreign)).toEqual(["exchange_rate: Enter the rate"]);
		expect(problems({ ...foreign, exchange_rate: "15.42" })).toEqual([]);
	});

	it("needs two different accounts for a transfer, and what arrived across currencies", () => {
		const transfer = values({ type: "transfer", amount: "100", account_id: "bml" });
		expect(problems(transfer)).toEqual(["to_account_id: Choose the account it goes to"]);
		expect(problems({ ...transfer, to_account_id: "bml" })).toEqual([
			"to_account_id: Choose two different accounts",
		]);
		expect(problems({ ...transfer, to_account_id: "usd" })).toEqual([
			"to_amount: Enter what arrived",
		]);
		expect(problems({ ...transfer, to_account_id: "usd", to_amount: "6.48" })).toEqual([]);
	});
});
