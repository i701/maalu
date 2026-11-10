import { describe, expect, it } from "vitest";
import { compact, niceTicks, spreadLabels } from "./charts";

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

	it("goes on to billions and trillions", () => {
		expect(compact(2_400_000_000)).toBe("2.4B");
		expect(compact(513_577_000)).toBe("514M");
		expect(compact(1_000_000_000)).toBe("1B");
		expect(compact(7_250_000_000_000)).toBe("7.3T");
		expect(compact(-3_000_000_000)).toBe("-3B");
	});

	it("keeps the sign", () => {
		expect(compact(-1500)).toBe("-1.5K");
		expect(compact(-42)).toBe("-42");
	});
});

describe("spreadLabels", () => {
	it("leaves labels that already have room where they are", () => {
		expect(spreadLabels([10, 50, 90], 20, 0, 100)).toEqual([10, 50, 90]);
	});

	it("pushes crowded labels apart, in the order of the nodes", () => {
		const out = spreadLabels([50, 52, 54], 20, 0, 200);
		expect(out).toEqual([50, 70, 90]);
	});

	it("keeps the order of the input whatever the order of the centres", () => {
		const out = spreadLabels([90, 10, 50], 20, 0, 100);
		expect(out).toEqual([90, 10, 50]);
	});

	it("slides the pile up when it would run off the bottom", () => {
		const out = spreadLabels([95, 96, 97], 20, 0, 100);
		expect(out[2]).toBe(100);
		expect(out[1]).toBe(80);
		expect(out[0]).toBe(60);
	});

	it("stays inside the box", () => {
		expect(spreadLabels([-5, 500], 20, 0, 100)).toEqual([0, 100]);
	});
});
