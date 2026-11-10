import { describe, expect, it } from "vitest";
import { sparkline } from "./sparkline";

describe("sparkline", () => {
	it("is nothing for fewer than two numbers", () => {
		expect(sparkline([], 100, 20)).toBeNull();
		expect(sparkline([5], 100, 20)).toBeNull();
		expect(sparkline([Number.NaN, 5], 100, 20)).toBeNull();
	});

	it("puts the biggest number at the top and the smallest at the bottom", () => {
		const s = sparkline([0, 10], 100, 20, 0);
		expect(s?.line).toBe("M0 20 L100 0");
		expect(s?.end).toEqual({ x: 100, y: 0 });
	});

	it("reads the direction from the first and last numbers", () => {
		expect(sparkline([1, 9, 3], 100, 20)?.direction).toBe("up");
		expect(sparkline([9, 1, 5], 100, 20)?.direction).toBe("down");
		expect(sparkline([4, 9, 4], 100, 20)?.direction).toBe("flat");
	});

	it("draws a series that never moves as a flat line along the bottom", () => {
		const s = sparkline([7, 7, 7], 100, 20, 2);
		expect(s?.direction).toBe("flat");
		expect(s?.line).toBe("M2 18 L50 18 L98 18");
	});

	it("keeps the line inside the padding and closes the wash to the bottom", () => {
		const s = sparkline([3, 8, 5, 9], 100, 30, 4);
		const ys = [...(s?.line.matchAll(/ (\d+(?:\.\d+)?)/g) ?? [])].map((m) => Number(m[1]));
		expect(Math.min(...ys)).toBeGreaterThanOrEqual(4);
		expect(Math.max(...ys)).toBeLessThanOrEqual(26);
		expect(s?.area.endsWith("Z")).toBe(true);
		expect(s?.area).toContain("L96 30");
	});
});
