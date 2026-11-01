import { describe, expect, it } from "vitest";
import {
	accountIdentity,
	adjustmentPreview,
	BANKS,
	bankChoices,
	creditUsage,
	excludedNote,
	hasCreditLimit,
} from "./accounts";

describe("accountIdentity", () => {
	it("joins the bank and the full number", () => {
		expect(accountIdentity({ bank: "BML", account_number: "7730000486374" })).toBe(
			"BML · 7730000486374",
		);
	});
	it("shows whichever is set", () => {
		expect(accountIdentity({ bank: "MIB", account_number: null })).toBe("MIB");
		expect(accountIdentity({ bank: null, account_number: "999" })).toBe("999");
	});
	it("is null when neither is set", () => {
		expect(accountIdentity({ bank: null, account_number: null })).toBeNull();
		expect(accountIdentity({})).toBeNull();
	});
});

describe("bankChoices", () => {
	it("puts the banks in use first, once each, then the usual ones not already there", () => {
		const choices = bankChoices([
			{ bank: "Other Bank" },
			{ bank: "bml" },
			{ bank: "bml" },
			{ bank: null },
		]);
		expect(choices.slice(0, 2)).toEqual(["Other Bank", "bml"]);
		expect(choices.filter((b) => b.toLowerCase() === "bml")).toHaveLength(1);
		expect(choices).toContain("MIB");
	});
	it("offers the usual banks when none is in use", () => {
		expect(bankChoices([])).toEqual(BANKS);
	});
});

describe("creditUsage", () => {
	it("shows what is owed against the limit", () => {
		expect(creditUsage({ balance: "-2500.00", credit_limit: "10000.00" })).toEqual({
			owed: "2500.00",
			limit: "10000.00",
			percent: 25,
		});
	});
	it("owes nothing when the balance is not negative, and can pass 100", () => {
		expect(creditUsage({ balance: "40.00", credit_limit: "1000" })?.percent).toBe(0);
		expect(creditUsage({ balance: "-1500", credit_limit: "1000" })?.percent).toBe(150);
	});
	it("is null without a usable limit", () => {
		expect(creditUsage({ balance: "-5", credit_limit: null })).toBeNull();
		expect(creditUsage({ balance: "-5", credit_limit: "0" })).toBeNull();
	});
});

describe("hasCreditLimit", () => {
	it("is for cards and overdrafts only", () => {
		expect(hasCreditLimit("card")).toBe(true);
		expect(hasCreditLimit("overdrafts")).toBe(true);
		expect(hasCreditLimit("savings")).toBe(false);
	});
});

describe("adjustmentPreview", () => {
	it("works out an income when the bank says more", () => {
		expect(adjustmentPreview("100.00", "balance", "140")).toEqual({
			after: "140.00",
			amount: "40.00",
			kind: "income",
		});
	});
	it("works out an expense when the bank says less, and from a negative balance", () => {
		expect(adjustmentPreview("100.00", "balance", "60.5")).toEqual({
			after: "60.50",
			amount: "39.50",
			kind: "expense",
		});
		expect(adjustmentPreview("-300.00", "balance", "-250")).toEqual({
			after: "-250.00",
			amount: "50.00",
			kind: "income",
		});
	});
	it("takes an amount to add or take away", () => {
		expect(adjustmentPreview("100.00", "amount", "25")).toEqual({
			after: "125.00",
			amount: "25.00",
			kind: "income",
		});
		expect(adjustmentPreview("100.00", "amount", "-5.5")?.kind).toBe("expense");
	});
	it("says nothing would change, and refuses what is not a number", () => {
		expect(adjustmentPreview("100.00", "balance", "100")?.kind).toBeNull();
		expect(adjustmentPreview("100.00", "amount", "0")?.kind).toBeNull();
		expect(adjustmentPreview("100.00", "balance", "")).toBeNull();
		expect(adjustmentPreview("100.00", "balance", "12abc")).toBeNull();
	});
});

describe("excludedNote", () => {
	it("says so only when an account is left out and the results are not about one account", () => {
		const accounts = [{ exclude_from_stats: false }, { exclude_from_stats: true }];
		expect(excludedNote(accounts, false)).toContain("left out");
		expect(excludedNote(accounts, true)).toBeUndefined();
		expect(excludedNote([{ exclude_from_stats: false }], false)).toBeUndefined();
	});
});
