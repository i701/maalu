import { afterEach, describe, expect, it } from "vitest";
import {
	formatAgo,
	formatDate,
	formatMoney,
	splitCurrency,
	formatMoneyCompact,
	formatMoneyFull,
	setShortNumbers,
	formatTime,
	formatWhen,
	sumDecimals,
	trimRate,
} from "./format";

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

// Intl puts a no-break space between the code and the number (so it never wraps there); read it as a space.
const plain = (text: string) => text.replaceAll("\u00a0", " ");

describe("formatMoneyCompact", () => {
	it("keeps the full figure below ten thousand", () => {
		expect(formatMoneyCompact("9999.99", "MVR")).toBe(formatMoney("9999.99", "MVR"));
		expect(formatMoneyCompact("0", "MVR")).toBe(formatMoney("0", "MVR"));
		expect(formatMoneyCompact("-250.5", "USD")).toBe(formatMoney("-250.5", "USD"));
	});

	it("shortens ten thousand and over to K, M, B and T", () => {
		expect(plain(formatMoneyCompact("10000", "MVR"))).toBe("MVR 10K");
		expect(plain(formatMoneyCompact("12345.67", "MVR"))).toBe("MVR 12.35K");
		expect(plain(formatMoneyCompact("513577000", "MVR"))).toBe("MVR 513.58M");
		expect(plain(formatMoneyCompact("1000000000", "USD"))).toBe("$1B");
		expect(plain(formatMoneyCompact("2400000000000", "USD"))).toBe("$2.4T");
	});

	it("keeps the sign of a debt", () => {
		expect(plain(formatMoneyCompact("-1500000", "MVR"))).toBe("-MVR 1.5M");
	});

	it("falls back to the full figure for something that is not a number or a currency", () => {
		expect(formatMoneyCompact("abc", "MVR")).toBe(formatMoney("abc", "MVR"));
	});
});

describe("the short numbers setting", () => {
	afterEach(() => setShortNumbers(false));

	it("leaves amounts in full by default", () => {
		expect(plain(formatMoney("1234.5", "MVR"))).toBe("MVR 1,234.50");
		expect(plain(formatMoney("513577000", "MVR"))).toBe("MVR 513,577,000.00");
	});

	it("shortens every amount from a thousand up when it is on, and only those", () => {
		setShortNumbers(true);
		expect(plain(formatMoney("999.99", "MVR"))).toBe("MVR 999.99");
		expect(plain(formatMoney("1234.5", "MVR"))).toBe("MVR 1.23K");
		expect(plain(formatMoney("513577000", "MVR"))).toBe("MVR 513.58M");
		expect(plain(formatMoney("-2500", "USD"))).toBe("-$2.5K");
	});

	it("shortens the tight places from a thousand too when it is on", () => {
		expect(plain(formatMoneyCompact("5000", "MVR"))).toBe("MVR 5,000.00");
		setShortNumbers(true);
		expect(plain(formatMoneyCompact("5000", "MVR"))).toBe("MVR 5K");
	});

	it("always has the exact amount for a hover title", () => {
		setShortNumbers(true);
		expect(plain(formatMoneyFull("1234.5", "MVR"))).toBe("MVR 1,234.50");
	});
});

describe("splitCurrency", () => {
	it("takes a code or a symbol off the front, keeping the sign on the number", () => {
		expect(splitCurrency(formatMoney("1234.5", "MVR"))).toEqual({
			currency: "MVR",
			number: "1,234.50",
		});
		expect(splitCurrency(formatMoney("-36.72", "USD"))).toEqual({
			currency: "$",
			number: "-36.72",
		});
		expect(splitCurrency(formatMoney("-1200", "MVR"))).toEqual({
			currency: "MVR",
			number: "-1,200.00",
		});
		expect(splitCurrency("MVR\u00a01.23K")).toEqual({ currency: "MVR", number: "1.23K" });
	});

	it("leaves text without a leading currency whole", () => {
		expect(splitCurrency("6")).toEqual({ currency: null, number: "6" });
		expect(splitCurrency("12.00 XYZ")).toEqual({ currency: null, number: "12.00 XYZ" });
	});
});
