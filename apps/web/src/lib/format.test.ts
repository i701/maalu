import { describe, expect, it } from "vitest";
import { formatAgo, formatDate, formatTime, formatWhen, sumDecimals, trimRate } from "./format";

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

describe("formatTime and formatWhen", () => {
	it("keeps hours and minutes", () => {
		expect(formatTime("14:30:00")).toBe("14:30");
		expect(formatTime("09:05")).toBe("09:05");
	});

	it("has nothing to show without a time", () => {
		expect(formatTime(null)).toBeNull();
	});

	it("adds the time after the date only when there is one", () => {
		expect(formatWhen("2026-03-10", "14:30:00")).toBe("10 Mar 2026, 14:30");
		expect(formatWhen("2026-03-10", null)).toBe("10 Mar 2026");
	});
});

describe("formatAgo", () => {
	const now = new Date("2026-10-31T12:00:00Z").getTime();
	const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString();

	it("says just now under a minute", () => {
		expect(formatAgo(ago(0), now)).toBe("just now");
		expect(formatAgo(ago(59), now)).toBe("just now");
		expect(formatAgo(ago(-30), now)).toBe("just now"); // a clock a little ahead
	});

	it("counts minutes, hours and days, singular and plural", () => {
		expect(formatAgo(ago(60), now)).toBe("1 minute ago");
		expect(formatAgo(ago(5 * 60), now)).toBe("5 minutes ago");
		expect(formatAgo(ago(60 * 60), now)).toBe("1 hour ago");
		expect(formatAgo(ago(3 * 3600), now)).toBe("3 hours ago");
		expect(formatAgo(ago(86400), now)).toBe("1 day ago");
		expect(formatAgo(ago(12 * 86400), now)).toBe("12 days ago");
	});

	it("is the date after a month", () => {
		expect(formatAgo(ago(40 * 86400), now)).toBe(formatDate(ago(40 * 86400)));
	});
});
