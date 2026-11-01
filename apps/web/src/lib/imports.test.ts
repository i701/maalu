import { describe, expect, it } from "vitest";
import type { Account, ImportPreview, PreviewRow } from "#/types/api";
import {
	accountForFilename,
	balanceNote,
	commitRows,
	countRows,
	filterRows,
	nameCounts,
	isFiltered,
	patchRows,
	resultLine,
	toReviewRows,
} from "./imports";

const row = (over: Partial<PreviewRow> = {}): PreviewRow => ({
	index: 0,
	date: "2026-10-04",
	time: null,
	type: "expense",
	amount: "30.0000",
	counterparty: "POWER CO",
	description: "Purchase · POWER CO",
	reference: "R1",
	kind: "Purchase",
	payment_method: "debit_card",
	balance: null,
	vendor: null,
	category: null,
	tags: [],
	transfer_account_id: null,
	duplicate: null,
	...over,
});
const preview = (rows: PreviewRow[], over: Partial<ImportPreview> = {}) =>
	({ rows, balance_matches: null, ...over }) as ImportPreview;

describe("toReviewRows", () => {
	it("leaves out rows already recorded and keeps the rest", () => {
		const rows = toReviewRows(
			preview([
				row({ index: 0 }),
				row({ index: 1, duplicate: "reference" }),
				row({ index: 2, duplicate: "transfer" }),
				row({ index: 3, duplicate: "possible" }),
			]),
		);
		expect(rows.map((r) => r.include)).toEqual([true, false, false, true]);
	});

	it("starts from the suggested vendor and category", () => {
		const [r] = toReviewRows(preview([row({ vendor: "Power Co", category: "Utilities" })]));
		expect([r.vendor_name, r.category_name]).toEqual(["Power Co", "Utilities"]);
	});
});

describe("patchRows", () => {
	const rows = toReviewRows(
		preview([
			row({ index: 0, counterparty: "POWER CO" }),
			row({ index: 1, counterparty: "power  co" }),
			row({ index: 2, counterparty: "SOMEONE" }),
			row({ index: 3, counterparty: "POWER CO", duplicate: "reference" }),
		]),
	);

	it("changes only the chosen rows", () => {
		const out = patchRows(rows, new Set([0]), { category_name: "Bills" });
		expect(out.map((r) => r.category_name)).toEqual(["Bills", "", "", ""]);
	});

	it("spreads to rows with the same name, ignoring spacing and case", () => {
		const out = patchRows(rows, new Set([0]), { vendor_name: "Power Co" }, true);
		expect(out.map((r) => r.vendor_name)).toEqual(["Power Co", "Power Co", "", ""]);
	});

	it("never touches a row that was already imported", () => {
		const out = patchRows(rows, new Set([3]), { category_name: "Bills" });
		expect(out[3].category_name).toBe("");
	});

	it("does not spread leaving a row out", () => {
		const out = patchRows(rows, new Set([0]), { include: false }, true);
		expect(out.map((r) => r.include)).toEqual([false, true, true, false]);
	});

	it("a transfer clears vendor and category, and a vendor clears the transfer", () => {
		const withVendor = patchRows(rows, new Set([0]), { vendor_name: "V", category_name: "C" });
		const asTransfer = patchRows(withVendor, new Set([0]), { transfer_account_id: "acc" });
		expect(asTransfer[0]).toMatchObject({
			vendor_name: "",
			category_name: "",
			transfer_account_id: "acc",
		});
		const back = patchRows(asTransfer, new Set([0]), { vendor_name: "V" });
		expect(back[0].transfer_account_id).toBe("");
	});
});

describe("commitRows", () => {
	it("skips only the rows the user left out, not the ones already imported", () => {
		let rows = toReviewRows(
			preview([row({ index: 0 }), row({ index: 1 }), row({ index: 2, duplicate: "reference" })]),
		);
		rows = patchRows(rows, new Set([1]), { include: false });
		expect(commitRows(rows).map((r) => r.skip)).toEqual([false, true, false]);
	});

	it("sends the vendor's usual tags only while the suggested vendor is used", () => {
		const base = toReviewRows(preview([row({ vendor: "V", tags: ["bills"] })]));
		expect(commitRows(base)[0].tags).toEqual(["bills"]);
		const changed = patchRows(base, new Set([0]), { vendor_name: "Other" });
		expect(commitRows(changed)[0].tags).toBeUndefined();
	});

	it("sends a transfer without vendor or category", () => {
		let rows = toReviewRows(preview([row()]));
		rows = patchRows(rows, new Set([0]), { transfer_account_id: "acc" });
		expect(commitRows(rows)[0]).toMatchObject({
			transfer_account_id: "acc",
			vendor_name: undefined,
			category: undefined,
		});
	});
});

const account = (id: string, number: string | null) => ({ id, account_number: number }) as Account;

describe("accountForFilename", () => {
	it("finds the account whose number is in the file name", () => {
		const accounts = [account("a", "1234"), account("b", "7770000010629")];
		expect(accountForFilename(accounts, "7770000010629-03102026-01112026-XYZ.csv")?.id).toBe("b");
	});
	it("prefers the longer number and ignores accounts with none", () => {
		const accounts = [account("a", null), account("b", "777"), account("c", "7770000010629")];
		expect(accountForFilename(accounts, "7770000010629.csv")?.id).toBe("c");
	});
	it("finds nothing when no number matches", () => {
		expect(accountForFilename([account("a", "999")], "statement.csv")).toBeNull();
	});
});

describe("countRows and notes", () => {
	it("counts what will happen", () => {
		let rows = toReviewRows(
			preview([
				row({ index: 0, category: "Bills" }),
				row({ index: 1 }),
				row({ index: 2, duplicate: "reference" }),
				row({ index: 3, duplicate: "transfer" }),
			]),
		);
		expect(countRows(rows)).toEqual({ toImport: 2, leftOut: 1, alreadyThere: 1, uncategorised: 1 });
		rows = patchRows(rows, new Set([1]), { transfer_account_id: "acc" });
		expect(countRows(rows).uncategorised).toBe(0);
	});

	it("says whether the balance matches", () => {
		expect(balanceNote(preview([]))).toBeNull();
		expect(balanceNote(preview([], { balance_matches: true }))).toMatch(/matches/);
		expect(
			balanceNote(
				preview([], { balance_matches: false, balance_after: "10", closing_balance: "12" }),
			),
		).toMatch(/10.*12/);
	});

	it("writes one line for the result", () => {
		expect(resultLine(42, 0, 0)).toBe("Imported 42 transactions.");
		expect(resultLine(1, 3, 2)).toBe("Imported 1 transaction. 3 already there. 2 failed.");
	});
});

describe("filterRows", () => {
	const rows = toReviewRows(
		preview([
			row({
				index: 0,
				counterparty: "POWER COMPANY LTD",
				description: "Purchase",
				amount: "2171.5800",
				reference: "RB1",
			}),
			row({
				index: 1,
				counterparty: "PERSON ONE",
				amount: "30.0000",
				description: "Transfer Debit",
			}),
			row({
				index: 2,
				counterparty: "PERSON TWO",
				description: "Transfer Credit",
				amount: "150.0000",
			}),
		]),
	);
	const ids = (f: Parameters<typeof filterRows>[1]) => filterRows(rows, f).map((r) => r.index);

	it("returns every row when nothing is set", () => {
		expect(ids({ q: "  " })).toEqual([0, 1, 2]);
		expect(isFiltered({ q: " " })).toBe(false);
	});

	it("finds words in what the bank wrote, ignoring case", () => {
		expect(ids({ q: "power" })).toEqual([0]);
		expect(ids({ q: "person" })).toEqual([1, 2]);
		expect(ids({ q: "debit person" })).toEqual([1]); // every word, in any order
	});

	it("finds the reference, the amount and the vendor or category chosen so far", () => {
		expect(ids({ q: "rb1" })).toEqual([0]);
		expect(ids({ q: "150" })).toEqual([2]);
		const chosen = patchRows(rows, new Set([2]), { category_name: "Rent" });
		expect(filterRows(chosen, { q: "rent" }).map((r) => r.index)).toEqual([2]);
	});

	it("limits by amount, both ends included", () => {
		expect(ids({ q: "", min: "30" })).toEqual([0, 1, 2]);
		expect(ids({ q: "", min: "31" })).toEqual([0, 2]);
		expect(ids({ q: "", max: "150" })).toEqual([1, 2]);
		expect(ids({ q: "", min: "100", max: "200" })).toEqual([2]);
	});

	it("combines the words and the range", () => {
		expect(ids({ q: "person", min: "100" })).toEqual([2]);
		expect(ids({ q: "power", max: "100" })).toEqual([]);
	});
});

describe("nameCounts", () => {
	it("counts rows by normalised name, leaving out ones already imported and unnamed ones", () => {
		const rows = toReviewRows(
			preview([
				row({ index: 0, counterparty: "POWER CO" }),
				row({ index: 1, counterparty: "power   co" }),
				row({ index: 2, counterparty: "POWER CO", duplicate: "reference" }),
				row({ index: 3, counterparty: "" }),
			]),
		);
		expect(nameCounts(rows)).toEqual(new Map([["power co", 2]]));
	});
});
