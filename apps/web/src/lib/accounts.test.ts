import { describe, expect, it } from "vitest";
import {
	accentText,
	accountIdentity,
	accountTints,
	adjustmentPreview,
	BANKS,
	bankChoices,
	bankSubsections,
	banksInUse,
	creditUsage,
	excludedNote,
	groupSpendsByDefault,
	hasCreditLimit,
	isOwedGroup,
	spendableValue,
	statementDays,
	tintBackground,
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

describe("banksInUse", () => {
	it("lists each bank once, alphabetically, leaving out empties", () => {
		expect(
			banksInUse([{ bank: "MIB" }, { bank: "BML" }, { bank: null }, { bank: "MIB" }, {}]),
		).toEqual(["BML", "MIB"]);
	});
	it("is empty when no account has a bank", () => {
		expect(banksInUse([{ bank: null }, {}])).toEqual([]);
	});
});

describe("bankSubsections", () => {
	it("puts each bank's accounts under the bank's name, and the rest last", () => {
		const items = [
			{ name: "MIB Current", bank: "MIB" },
			{ name: "BML Current", bank: "BML" },
			{ name: "Wallet", bank: null },
			{ name: "MIB Savings", bank: "MIB" },
		];
		expect(bankSubsections(items)).toEqual([
			{ label: "BML", items: [{ name: "BML Current", bank: "BML" }] },
			{
				label: "MIB",
				items: [
					{ name: "MIB Current", bank: "MIB" },
					{ name: "MIB Savings", bank: "MIB" },
				],
			},
			{ label: "No bank", items: [{ name: "Wallet", bank: null }] },
		]);
	});
	it("does not split a section with one bank or none", () => {
		expect(bankSubsections([{ bank: "BML" }, { bank: "BML" }])).toBeNull();
		expect(bankSubsections([{ bank: null }, {}])).toBeNull();
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

describe("the spend-from-this-account switch", () => {
	it("sends nothing while it is untouched or back at what the group says", () => {
		expect(spendableValue(null, "cash")).toBeNull();
		expect(spendableValue(true, "cash")).toBeNull(); // cash counts anyway
		expect(spendableValue(false, "savings")).toBeNull(); // savings are apart anyway
	});

	it("sends your choice when it differs from the group", () => {
		expect(spendableValue(true, "savings")).toBe(true);
		expect(spendableValue(false, "cash")).toBe(false);
	});

	it("is never sent for money that is owed", () => {
		expect(isOwedGroup("card")).toBe(true);
		expect(isOwedGroup("loan")).toBe(true);
		expect(isOwedGroup("savings")).toBe(false);
		expect(spendableValue(true, "card")).toBeNull();
	});

	it("knows what a group does when you do not choose", () => {
		expect(groupSpendsByDefault("cash")).toBe(true);
		expect(groupSpendsByDefault("accounts")).toBe(true);
		expect(groupSpendsByDefault("savings")).toBe(false);
	});
});

describe("statementDays", () => {
	it("is empty when both are empty", () => {
		expect(statementDays("", " ")).toEqual({
			ok: true,
			statement_day: null,
			due_day: null,
		});
	});

	it("reads two whole days", () => {
		expect(statementDays("5", " 25 ")).toEqual({
			ok: true,
			statement_day: 5,
			due_day: 25,
		});
	});

	it("needs both or neither", () => {
		expect(statementDays("5", "")).toMatchObject({ ok: false });
		expect(statementDays("", "25")).toMatchObject({ ok: false });
	});

	it("refuses anything that is not a day of the month", () => {
		for (const [a, b] of [
			["0", "5"],
			["5", "32"],
			["x", "5"],
			["5.5", "5"],
			["-1", "5"],
		])
			expect(statementDays(a, b)).toMatchObject({ ok: false });
	});
});

describe("accountTints", () => {
	const ids = ["a1", "b2", "c3", "d4", "e5", "f6", "g7"];

	it("gives the same account the same colour every time", () => {
		expect(accountTints(ids)).toEqual(accountTints([...ids].toReversed()));
		expect(accountTints(ids).get("c3")).toBe(accountTints(ids).get("c3"));
	});

	it("gives up to seven accounts seven different colours", () => {
		expect(new Set(accountTints(ids).values()).size).toBe(7);
	});

	it("repeats colours only past what the palette holds, and never uses grey", () => {
		const many = accountTints([...ids, "h8", "i9"]);
		expect(many.size).toBe(9);
		expect(new Set(many.values()).size).toBe(7);
		expect([...many.values()]).not.toContain("slate");
	});

	it("tints with a subtle wash that follows the theme surface", () => {
		expect(tintBackground("green")).toContain("color-mix");
		expect(tintBackground("green")).toContain("--md-sys-color-surface-container-low");
		expect(accentText("green")).toContain("--md-sys-color-on-surface");
	});
});
