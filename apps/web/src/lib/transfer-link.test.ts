import { describe, expect, it } from "vitest";
import type { Transaction } from "#/types/api";
import { daysApartText, linkablePair } from "./transfer-link";

const tx = (over: Partial<Transaction>) =>
	({
		id: "x",
		type: "expense",
		account: { id: "bml" },
		planned: false,
		adjustment: false,
		splits: [],
		refunded_amount: "0.0000",
		refund_of: null,
		...over,
	}) as unknown as Transaction;

const out = tx({ id: "out", type: "expense", account: { id: "bml" } as Transaction["account"] });
const inn = tx({ id: "in", type: "income", account: { id: "mib" } as Transaction["account"] });

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
		const same = tx({ id: "i3", type: "income", account: { id: "bml" } as Transaction["account"] });
		expect(linkablePair([out, same])).toBeNull();
		expect(linkablePair([out, tx({ id: "i4", type: "income", account: null })])).toBeNull();
	});

	it("leaves out what cannot become a transfer", () => {
		const items = tx({ ...out, id: "o3", splits: [{ id: "s" }] as Transaction["splits"] });
		expect(linkablePair([items, inn])).toBeNull();
		expect(linkablePair([tx({ ...out, refunded_amount: "5.0000" }), inn])).toBeNull();
		expect(linkablePair([tx({ ...out, planned: true }), inn])).toBeNull();
		expect(linkablePair([out, tx({ ...inn, adjustment: true })])).toBeNull();
		expect(
			linkablePair([out, tx({ ...inn, refund_of: { id: "p" } as Transaction["refund_of"] })]),
		).toBeNull();
	});
});

describe("daysApartText", () => {
	it("says it in words", () => {
		expect(daysApartText(0)).toBe("same day");
		expect(daysApartText(1)).toBe("1 day apart");
		expect(daysApartText(2)).toBe("2 days apart");
	});
});
