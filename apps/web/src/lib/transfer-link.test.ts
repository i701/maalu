import { describe, expect, it } from "vitest";
import type { Transaction } from "#/types/api";
import { accountRef as account, makeTransaction } from "#/test/fixtures";
import { daysApartText, linkablePair } from "./transfer-link";

const split = (id: string): Transaction["splits"][number] => ({
	id,
	amount: "10.0000",
	category: "",
	category_color: "",
	category_id: "",
	name: "",
	quantity: "1",
	refund_of_split_id: null,
	refunded_amount: "0.0000",
	tax_amount: null,
});

const refundOf = (id: string): NonNullable<Transaction["refund_of"]> => ({
	id,
	amount: "10.0000",
	category: "",
	currency: "MVR",
	transaction_date: "2026-11-13",
	vendor_name: null,
});

const tx = (over: Partial<Transaction>): Transaction => makeTransaction({ id: "x", ...over });

const out = tx({ id: "out", type: "expense", account: account("bml") });
const inn = tx({ id: "in", type: "income", account: account("mib") });

describe("linkablePair", () => {
	it("is the expense and the income in different accounts, whichever order they were picked", () => {
		expect(linkablePair([out, inn])).toEqual({ expense: out, income: inn });
		expect(linkablePair([inn, out])).toEqual({ expense: out, income: inn });
	});

	it("needs exactly two", () => {
		expect(linkablePair([])).toBeNull();
		expect(linkablePair([out])).toBeNull();
		expect(linkablePair([out, inn, tx({ id: "z" })])).toBeNull();
	});

	it("needs one of each kind", () => {
		expect(linkablePair([out, tx({ id: "o2", type: "expense" })])).toBeNull();
		expect(linkablePair([inn, tx({ id: "i2", type: "income" })])).toBeNull();
		expect(linkablePair([out, tx({ id: "t", type: "transfer" })])).toBeNull();
	});

	it("needs different accounts, both set", () => {
		const same = tx({ id: "i3", type: "income", account: account("bml") });
		expect(linkablePair([out, same])).toBeNull();
		expect(linkablePair([out, { ...inn, id: "i4", account: null }])).toBeNull();
	});

	it("leaves out what cannot become a transfer", () => {
		const items = tx({ ...out, id: "o3", splits: [split("s")] });
		expect(linkablePair([items, inn])).toBeNull();
		expect(linkablePair([tx({ ...out, refunded_amount: "5.0000" }), inn])).toBeNull();
		expect(linkablePair([tx({ ...out, planned: true }), inn])).toBeNull();
		expect(linkablePair([out, tx({ ...inn, adjustment: true })])).toBeNull();
		expect(linkablePair([out, tx({ ...inn, refund_of: refundOf("p") })])).toBeNull();
	});
});

describe("daysApartText", () => {
	it("says it in words", () => {
		expect(daysApartText(0)).toBe("same day");
		expect(daysApartText(1)).toBe("1 day apart");
		expect(daysApartText(2)).toBe("2 days apart");
	});
});
