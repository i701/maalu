import { describe, expect, it } from "vitest";
import { lineAmount, newRow, rowsFromSplits, splitTotal } from "./splits";

const row = (price: string, quantity = "1") => newRow({ price, quantity });

describe("lineAmount without GST", () => {
	it("is quantity times price", () => {
		expect(lineAmount(row("12.50", "6"), "none", "")).toEqual({ amount: "75.00", tax: null });
		expect(lineAmount(row("0.99", "3"), "none", "")).toEqual({ amount: "2.97", tax: null });
	});

	it("supports fractional quantities (weights)", () => {
		expect(lineAmount(row("8.00", "1.25"), "none", "")).toEqual({ amount: "10.00", tax: null });
	});

	it("ignores a rate when GST is off", () => {
		expect(lineAmount(row("10"), "none", "8")).toEqual({ amount: "10.00", tax: null });
	});

	it("rounds to four decimals, half to even", () => {
		// 0.3333 x 0.333 = 0.1109889 -> 0.1110, shown without the trailing zero
		expect(lineAmount(row("0.3333", "0.333"), "none", "")?.amount).toBe("0.111");
	});
});

describe("lineAmount with GST", () => {
	it("adds the tax on top when prices exclude GST", () => {
		expect(lineAmount(row("10"), "excluded", "8")).toEqual({ amount: "10.80", tax: "0.80" });
		expect(lineAmount(row("100", "2"), "excluded", "8")).toEqual({
			amount: "216.00",
			tax: "16.00",
		});
	});

	it("takes the tax out of the price when prices include GST", () => {
		expect(lineAmount(row("10.80"), "included", "8")).toEqual({ amount: "10.80", tax: "0.80" });
	});

	it("handles a fractional rate", () => {
		expect(lineAmount(row("100"), "excluded", "8.5")).toEqual({ amount: "108.50", tax: "8.50" });
	});

	it("rounds the tax half to even", () => {
		// 10% of 0.0625 = 0.00625 and 10% of 0.0875 = 0.00875: both exactly halfway at four decimals
		expect(lineAmount(row("0.0625"), "excluded", "10")?.tax).toBe("0.0062"); // down, to the even 2
		expect(lineAmount(row("0.0875"), "excluded", "10")?.tax).toBe("0.0088"); // up, to the even 8
	});

	it("falls back to no tax when the rate is blank or zero", () => {
		expect(lineAmount(row("10"), "excluded", "")).toEqual({ amount: "10.00", tax: null });
		expect(lineAmount(row("10"), "included", "0")).toEqual({ amount: "10.00", tax: null });
	});

	it("treats an invalid rate as no line yet", () => {
		expect(lineAmount(row("10"), "excluded", "abc")).toEqual({ amount: "10.00", tax: null });
	});
});

describe("lineAmount while incomplete", () => {
	it("is null until quantity and price are valid and positive", () => {
		expect(lineAmount(row(""), "none", "")).toBeNull();
		expect(lineAmount(row("abc"), "none", "")).toBeNull();
		expect(lineAmount(row("0"), "none", "")).toBeNull();
		expect(lineAmount(row("5", "0"), "none", "")).toBeNull();
		expect(lineAmount(row("5", "x"), "none", "")).toBeNull();
		expect(lineAmount(row("5.12345"), "none", "")).toBeNull(); // too many decimals
	});
});

describe("a saved line", () => {
	it("keeps its exact total until quantity or price is edited", () => {
		const saved = newRow({
			price: "3.3333",
			quantity: "3",
			locked: { amount: "10.00", tax: "0.74" },
		});
		expect(lineAmount(saved, "excluded", "8")).toEqual({ amount: "10.00", tax: "0.74" });
		const edited = { ...saved, locked: undefined };
		expect(lineAmount(edited, "none", "")?.amount).toBe("9.9999"); // recalculated: 3.3333 x 3
	});
});

describe("splitTotal", () => {
	it("adds complete lines exactly and skips incomplete ones", () => {
		const lines = [
			lineAmount(row("12.50", "6"), "none", ""),
			lineAmount(row("5.50", "2"), "none", ""),
			lineAmount(row(""), "none", ""),
		];
		expect(splitTotal(lines)).toBe("86.00");
	});

	it("is zero with no lines", () => {
		expect(splitTotal([])).toBe("0.00");
		expect(splitTotal([null, null])).toBe("0.00");
	});

	it("does not drift the way floats do", () => {
		const lines = Array.from({ length: 10 }, () => lineAmount(row("0.10"), "none", ""));
		expect(splitTotal(lines)).toBe("1.00");
	});
});

describe("rowsFromSplits", () => {
	it("restores rows with their saved totals and a per-unit price for display", () => {
		const [eggs] = rowsFromSplits([
			{
				name: "Eggs",
				quantity: "6.000",
				category: "Groceries",
				amount: "75.0000",
				tax_amount: null,
			},
		]);
		expect(eggs).toMatchObject({
			name: "Eggs",
			quantity: "6",
			category: "Groceries",
			price: "12.50",
		});
		expect(eggs.locked).toEqual({ amount: "75.0000", tax: null });
	});

	it("keeps a saved tax amount", () => {
		const [row1] = rowsFromSplits([
			{
				name: "Milk",
				quantity: "1.000",
				category: "Groceries",
				amount: "10.8000",
				tax_amount: "0.8000",
			},
		]);
		expect(row1.locked).toEqual({ amount: "10.8000", tax: "0.8000" });
	});

	it("gives every row its own key", () => {
		const rows = rowsFromSplits([
			{ name: "a", quantity: "1.000", category: "c", amount: "1.0000", tax_amount: null },
			{ name: "b", quantity: "1.000", category: "c", amount: "1.0000", tax_amount: null },
		]);
		expect(new Set(rows.map((r) => r.key)).size).toBe(2);
	});
});
