import { describe, expect, it } from "vitest";
import { compact, niceTicks } from "./charts";

describe("niceTicks", () => {
	it("returns round values that cover the range", () => {
		const ticks = niceTicks(0, 47_000, 3);
		expect(ticks[0]).toBeLessThanOrEqual(0);
		expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(47_000);
		// evenly spaced, and a 1, 2 or 5 times a power of ten
		const step = ticks[1] - ticks[0];
		expect(ticks.every((t, i) => i === 0 || Math.abs(t - ticks[i - 1] - step) < 1e-6)).toBe(true);
		expect([1, 2, 5]).toContain(step / 10 ** Math.floor(Math.log10(step)));
	});

	it("starts below a minimum that is not a round number", () => {
		const ticks = niceTicks(103_400, 129_800, 3);
		expect(ticks[0]).toBeLessThanOrEqual(103_400);
		expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(129_800);
	});

	it("handles a flat series", () => {
		const ticks = niceTicks(5, 5);
		expect(ticks.length).toBeGreaterThan(1);
		expect(ticks[0]).toBeLessThan(5);
		expect(ticks[ticks.length - 1]).toBeGreaterThan(5);
	});

	it("handles values below zero", () => {
		const ticks = niceTicks(-500, 1200, 4);
		expect(ticks[0]).toBeLessThanOrEqual(-500);
		expect(ticks).toContain(0);
	});

	it("falls back to something usable for non-finite input", () => {
		expect(niceTicks(Number.NaN, 10)).toEqual([0, 1]);
		expect(niceTicks(0, Number.POSITIVE_INFINITY)).toEqual([0, 1]);
	});

	it("gives clean values for a small range", () => {
		expect(niceTicks(0, 1, 4)).toEqual([0, 0.5, 1]);
		const fifths = niceTicks(0, 1, 5);
		[0, 0.2, 0.4, 0.6, 0.8, 1].forEach((want, i) => expect(fifths[i]).toBeCloseTo(want));
		expect(fifths).toHaveLength(6);
	});
});

describe("compact", () => {
	it("leaves small numbers alone", () => {
		expect(compact(0)).toBe("0");
		expect(compact(950)).toBe("950");
	});

	it("abbreviates thousands and millions", () => {
		expect(compact(1000)).toBe("1K");
		expect(compact(1200)).toBe("1.2K");
		expect(compact(12_900)).toBe("12.9K");
		expect(compact(130_000)).toBe("130K");
		expect(compact(3_400_000)).toBe("3.4M");
	});

	it("keeps the sign", () => {
		expect(compact(-1500)).toBe("-1.5K");
		expect(compact(-42)).toBe("-42");
	});
});
