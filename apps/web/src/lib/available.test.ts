import { describe, expect, it } from "vitest";
import type { AvailableToSpend } from "#/types/api";
import { hasAccounts, isShort, workingLine } from "./available";

const base = (over: Partial<AvailableToSpend> = {}) =>
	({
		currency: "MVR",
		balance: "5200.0000",
		accounts: [{}, {}],
		bills: [],
		bills_total: "0",
		card_payments: [],
		card_payments_total: "0",
		reserved: [],
		reserved_total: "0",
		available: "5200.0000",
		...over,
	}) as unknown as AvailableToSpend;

describe("isShort", () => {
	it("is true only below zero", () => {
		expect(isShort({ available: "-0.01" })).toBe(true);
		expect(isShort({ available: "0" })).toBe(false);
		expect(isShort({ available: "12.5" })).toBe(false);
	});
});

describe("workingLine", () => {
	it("says what is held when nothing is taken off", () => {
		expect(workingLine(base())).toMatch(/^MVR\s5,200\.00 in 2 accounts$/);
	});

	it("takes the bills and the set-asides off, with their counts", () => {
		const line = workingLine(
			base({
				bills: [{}, {}] as AvailableToSpend["bills"],
				bills_total: "420",
				reserved: [{}] as AvailableToSpend["reserved"],
				reserved_total: "1000",
			}),
		);
		expect(line).toMatch(/less MVR\s420\.00 for 2 bills and MVR\s1,000\.00 set aside for 1 goal$/);
	});

	it("counts credit card statements apart from bills", () => {
		const line = workingLine(
			base({
				card_payments: [{}] as AvailableToSpend["card_payments"],
				card_payments_total: "300",
			}),
		);
		expect(line).toMatch(/less MVR\s300\.00 for 1 card statement$/);
	});

	it("mentions only what applies", () => {
		const line = workingLine(base({ bills: [{}] as AvailableToSpend["bills"], bills_total: "50" }));
		expect(line).toMatch(/less MVR\s50\.00 for 1 bill$/);
		expect(line).not.toMatch(/goal/);
	});
});

describe("hasAccounts", () => {
	it("is whether any everyday account counts", () => {
		expect(hasAccounts(base())).toBe(true);
		expect(hasAccounts(base({ accounts: [] }))).toBe(false);
	});
});
