import { describe, expect, it } from "vitest";
import type { Transaction } from "#/types/api";
import { amountLeft, canRefund, isRefund, wasRefunded } from "./refund";

const purchase = (over: Partial<Transaction> = {}) =>
	({
		type: "expense",
		planned: false,
		amount: "100.0000",
		refunded_amount: "0.0000",
		refund_of: null,
		...over,
	}) as Transaction;

describe("amountLeft", () => {
	it("is the amount less what was refunded, exactly", () => {
		expect(amountLeft("100.0000", "30.0000")).toBe("70.00");
		expect(amountLeft("0.30", "0.10")).toBe("0.20");
		expect(amountLeft("12.3456", "0.0001")).toBe("12.3455");
	});

	it("is zero when it is all refunded", () => {
		expect(amountLeft("50.0000", "50.0000")).toBe("0.00");
	});
});

describe("canRefund", () => {
	it("is true for a posted expense with something left", () => {
		expect(canRefund(purchase())).toBe(true);
		expect(canRefund(purchase({ refunded_amount: "99.9900" }))).toBe(true);
	});

	it("is false once everything is refunded", () => {
		expect(canRefund(purchase({ refunded_amount: "100.0000" }))).toBe(false);
	});

	it("is false for income, transfers and planned purchases", () => {
		expect(canRefund(purchase({ type: "income" }))).toBe(false);
		expect(canRefund(purchase({ type: "transfer" }))).toBe(false);
		expect(canRefund(purchase({ planned: true }))).toBe(false);
	});
});

describe("isRefund / wasRefunded", () => {
	it("tells a refund from a purchase", () => {
		expect(isRefund(purchase())).toBe(false);
		expect(isRefund(purchase({ type: "income", refund_of: { id: "x" } as never }))).toBe(true);
	});

	it("says whether any refunds were made", () => {
		expect(wasRefunded(purchase())).toBe(false);
		expect(wasRefunded(purchase({ refunded_amount: "0.0100" }))).toBe(true);
	});
});
