import { describe, expect, it } from "vitest";
import type { BalanceHistory, Transaction } from "#/types/api";
import {
	accountDock,
	balanceMap,
	historyPoints,
	historyRows,
	historySummary,
	accountEffect,
	signOf,
} from "./account-detail";

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

const history = (balances: number[]): BalanceHistory => ({
	currency: "MVR",
	points: balances.map((b, i) => ({
		date: `2026-11-${String(i + 1).padStart(2, "0")}`,
		balance: `${b}.0000`,
	})),
});

describe("balance history", () => {
	it("is one chart point per day, with the balance as a number", () => {
		const points = historyPoints(history([100, 250]));
		expect(points.map((p) => p.value)).toEqual([100, 250]);
		expect(points[0].label).toContain("2026");
	});

	it("lists one row a week, newest first, always ending on the latest day", () => {
		const rows = historyRows(history(Array.from({ length: 15 }, (_, i) => i * 10)));
		expect(rows.map((r) => r.date)).toEqual(["2026-11-15", "2026-11-08", "2026-11-01"]);
		expect(rows[0].balance).toBe("140.0000");
	});

	it("says where the balance started, ended and how low and high it went", () => {
		expect(historySummary(history([500, 200, 900, 700]))).toEqual({
			first: 500,
			last: 700,
			low: 200,
			high: 900,
		});
		expect(historySummary(history([]))).toBeNull();
	});

	it("looks a balance up by its transaction", () => {
		expect(balanceMap([{ transaction_id: "t1", balance: "120.0000" }])).toEqual({
			t1: "120.0000",
		});
	});
});

describe("accountDock", () => {
	const account = {
		balance: "1053.78",
		currency: "MVR",
		credit_limit: null,
		group: "accounts",
	} as const;
	const totals = { income: "0.00", expense: "83.00", currency: "MVR" };

	it("gives the balance and the month's in and out, with a short month", () => {
		const dock = accountDock(account, totals, "November 2026");
		expect(dock.map((d) => d.label)).toEqual(["Balance", "In Nov", "Out Nov"]);
		expect(dock[0]?.value).toContain("1,053.78");
		expect(dock[2]?.value).toContain("83.00");
		expect(dock[0]?.tone).toBeUndefined();
	});

	it("tints a negative balance and calls a credit card's balance what is owed", () => {
		const card = {
			balance: "-250.00",
			currency: "MVR",
			credit_limit: "1000.00",
			group: "card",
		} as const;
		const [first] = accountDock(card, totals, "March 2026");
		expect(first?.label).toBe("Owed");
		expect(first?.tone).toBe("negative");
	});
});
