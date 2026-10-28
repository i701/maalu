import { describe, expect, it } from "vitest";
import { sumDecimals, trimRate } from "./format";

describe("sumDecimals", () => {
	it("adds decimal strings exactly", () => {
		expect(sumDecimals(["0.1", "0.2"])).toBe("0.30");
		expect(sumDecimals(["19.99", "0.01"])).toBe("20.00");
		expect(sumDecimals(["1234.5678", "0.0001"])).toBe("1234.5679");
	});

	it("handles negatives, including a total below zero", () => {
		expect(sumDecimals(["10", "-3.5"])).toBe("6.50");
		expect(sumDecimals(["1", "-2.25"])).toBe("-1.25");
		expect(sumDecimals(["-0.5", "-0.25"])).toBe("-0.75");
	});

	it("is zero for no values, and for values that cancel", () => {
		expect(sumDecimals([])).toBe("0.00");
		expect(sumDecimals(["5", "-5"])).toBe("0.00");
	});

	it("copes with the 4-decimal amounts the API sends", () => {
		expect(sumDecimals(["32655.5600", "-28026.9700"])).toBe("4628.59");
	});

	it("does not drift over many additions", () => {
		expect(sumDecimals(Array.from({ length: 100 }, () => "0.01"))).toBe("1.00");
	});
});

describe("trimRate", () => {
	it("drops trailing zeros", () => {
		expect(trimRate("15.39920000")).toBe("15.3992");
		expect(trimRate("15.50000000")).toBe("15.5");
	});

	it("drops a bare decimal point", () => {
		expect(trimRate("1.00000000")).toBe("1");
	});

	it("leaves a whole number and a value with no trailing zeros alone", () => {
		expect(trimRate("15")).toBe("15");
		expect(trimRate("0.06489200")).toBe("0.064892");
		expect(trimRate("100")).toBe("100");
	});
});
