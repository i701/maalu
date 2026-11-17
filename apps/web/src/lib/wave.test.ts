import { describe, expect, it } from "vitest";
import { wavePoints } from "./wave";

describe("wavePoints", () => {
	it("keeps the whole stroke inside the tile", () => {
		const thickness = 6;
		const height = 12;
		for (const { y } of wavePoints(thickness, height, 27)) {
			expect(y - thickness / 2).toBeGreaterThanOrEqual(-1e-9);
			expect(y + thickness / 2).toBeLessThanOrEqual(height + 1e-9);
		}
	});

	it("repeats exactly one wavelength later, so tiles join without a seam", () => {
		const points = wavePoints(6, 12, 27, 24);
		const at = (x: number) => points.find((p) => Math.abs(p.x - x) < 1e-9)?.y;
		expect(at(0)).toBeCloseTo(at(27) ?? Number.NaN);
	});
});
