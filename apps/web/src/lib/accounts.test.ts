import { describe, expect, it } from "vitest";
import { accountIdentity, BANKS, bankChoices } from "./accounts";

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
