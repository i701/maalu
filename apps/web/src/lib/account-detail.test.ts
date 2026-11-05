import { describe, expect, it } from "vitest";
import type { Transaction } from "#/types/api";
import { accountEffect, signOf } from "./account-detail";

const tx = (over: Partial<Transaction>) =>
	({
		type: "expense",
		amount: "100.0000",
		currency: "MVR",
		to_amount: null,
		account: { id: "a", name: "Main", currency: "MVR" },
		to_account: null,
		...over,
	}) as Transaction;

describe("accountEffect", () => {
	it("takes an expense out and brings income in, in the account's currency", () => {
		expect(accountEffect(tx({}), "a")).toMatchObject({ positive: false, amount: "100.0000" });
		expect(accountEffect(tx({ type: "income" }), "a")).toMatchObject({ positive: true });
	});

	it("brings a refund in, since a refund is income to the account", () => {
		expect(
			accountEffect(tx({ type: "income", refund_of: { id: "x" } as never }), "a").positive,
		).toBe(true);
	});

	it("takes a transfer out of its source and names where it went", () => {
		const t = tx({
			type: "transfer",
			to_account: { id: "b", name: "Savings", currency: "MVR" } as Transaction["to_account"],
		});
		expect(accountEffect(t, "a")).toEqual({
			positive: false,
			amount: "100.0000",
			currency: "MVR",
			counterpart: "To Savings",
		});
	});

	it("brings a transfer in to its destination, as what arrived there", () => {
		const t = tx({
			type: "transfer",
			currency: "USD",
			amount: "10.0000",
			to_amount: "154.0000",
			account: { id: "a", name: "Dollars", currency: "USD" } as Transaction["account"],
			to_account: { id: "b", name: "Main", currency: "MVR" } as Transaction["to_account"],
		});
		expect(accountEffect(t, "b")).toEqual({
			positive: true,
			amount: "154.0000",
			currency: "MVR",
			counterpart: "From Dollars",
		});
	});

	it("copes with a deleted account on the other side", () => {
		const t = tx({ type: "transfer", to_account: null });
		expect(accountEffect(t, "a").counterpart).toBe("To a deleted account");
	});
});

describe("signOf", () => {
	it("is a plus for money in and a minus for money out", () => {
		expect(signOf({ positive: true })).toBe("+");
		expect(signOf({ positive: false })).toBe("−");
	});
});
