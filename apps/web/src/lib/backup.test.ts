import { describe, expect, it } from "vitest";
import { restoredMessage } from "./backup";

describe("restoredMessage", () => {
	it("names the accounts and transactions", () => {
		expect(restoredMessage({ accounts: 3, transactions: 250, tags: 4 })).toBe(
			"Restored 3 accounts and 250 transactions",
		);
	});
	it("uses the singular", () => {
		expect(restoredMessage({ accounts: 1, transactions: 1 })).toBe(
			"Restored 1 account and 1 transaction",
		);
	});
	it("says so when the backup had nothing", () => {
		expect(restoredMessage({})).toBe("Restored, but the backup was empty");
	});
});
