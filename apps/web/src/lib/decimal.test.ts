import { describe, expect, it } from "vitest";
import { divRound, fromScaled, toScaled } from "./decimal";

describe("toScaled", () => {
	it("scales a decimal string to an integer", () => {
		expect(toScaled("12.5", 4)).toBe(125000n);
		expect(toScaled("0", 4)).toBe(0n);
		expect(toScaled("7", 2)).toBe(700n);
		expect(toScaled("0.0001", 4)).toBe(1n);
	});

	it("rejects more decimals than the scale allows", () => {
		expect(toScaled("1.23456", 4)).toBeNull();
		expect(toScaled("1.5", 0)).toBeNull();
	});

	it("rejects anything that is not a non-negative decimal", () => {
		for (const bad of ["", " ", "abc", "-1", "1e3", "1.", ".5", "1,5", "1.2.3"]) {
			expect(toScaled(bad, 4), bad).toBeNull();
		}
	});

	it("ignores surrounding spaces", () => {
		expect(toScaled("  3.25 ", 2)).toBe(325n);
	});

	it("is exact where floats are not", () => {
		// 0.1 + 0.2 !== 0.3 as floats
		expect((toScaled("0.1", 4) ?? 0n) + (toScaled("0.2", 4) ?? 0n)).toBe(toScaled("0.3", 4));
	});
});

describe("fromScaled", () => {
	it("formats with at least two decimals and trims the rest of the zeros", () => {
		expect(fromScaled(125000n, 4)).toBe("12.50");
		expect(fromScaled(12345678n, 4)).toBe("1234.5678");
		expect(fromScaled(120000n, 4)).toBe("12.00");
		expect(fromScaled(5n, 4)).toBe("0.0005");
	});

	it("honours a different minimum", () => {
		expect(fromScaled(6000n, 3, 0)).toBe("6");
		expect(fromScaled(6500n, 3, 0)).toBe("6.5");
		expect(fromScaled(100n, 2, 0)).toBe("1");
	});

	it("pads a value below one", () => {
		expect(fromScaled(7n, 4)).toBe("0.0007");
		expect(fromScaled(0n, 4)).toBe("0.00");
	});

	it("handles negatives", () => {
		expect(fromScaled(-125000n, 4)).toBe("-12.50");
	});

	it("round-trips with toScaled", () => {
		for (const v of ["0.01", "1234.5678", "99999999.9999", "3.10"]) {
			const n = toScaled(v, 4) as bigint;
			expect(toScaled(fromScaled(n, 4), 4)).toBe(n);
		}
	});
});

describe("divRound", () => {
	it("rounds half to even, like the API", () => {
		expect(divRound(5n, 2n)).toBe(2n); // 2.5 -> 2
		expect(divRound(7n, 2n)).toBe(4n); // 3.5 -> 4
		expect(divRound(15n, 10n)).toBe(2n); // 1.5 -> 2
		expect(divRound(25n, 10n)).toBe(2n); // 2.5 -> 2
	});

	it("rounds anything else to the nearest", () => {
		expect(divRound(10n, 3n)).toBe(3n);
		expect(divRound(11n, 3n)).toBe(4n);
		expect(divRound(1n, 3n)).toBe(0n);
		expect(divRound(2n, 3n)).toBe(1n);
	});

	it("is exact when it divides evenly", () => {
		expect(divRound(12n, 4n)).toBe(3n);
		expect(divRound(0n, 7n)).toBe(0n);
	});
});
