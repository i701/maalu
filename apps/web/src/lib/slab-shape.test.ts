import { describe, expect, it } from "vitest";
import { slabPath } from "./slab-shape";

const shape = { width: 400, height: 124, radius: 16, bite: 26, fillet: 14, seam: 1.5 };

/** The x and y of every point the path visits (an arc's flags and radii are not points). */
function points(d: string) {
	const out: { x: number; y: number }[] = [];
	let at = { x: 0, y: 0 };
	for (const [, command, args] of d.matchAll(/([MHVA])([^MHVAZ]*)/g)) {
		const n = (args.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
		if (command === "M") at = { x: n[0], y: n[1] };
		else if (command === "H") at = { ...at, x: n[0] };
		else if (command === "V") at = { ...at, y: n[0] };
		else at = { x: n[5], y: n[6] };
		out.push(at);
	}
	return out;
}

describe("slabPath", () => {
	it("is a closed outline that starts after the top left corner", () => {
		const d = slabPath(shape);
		expect(d.startsWith("M16.5 0.5")).toBe(true);
		expect(d.endsWith("Z")).toBe(true);
	});

	it("keeps the stroke inside the box", () => {
		for (const { x, y } of points(slabPath(shape))) {
			expect(x).toBeGreaterThanOrEqual(0.5);
			expect(x).toBeLessThanOrEqual(399.5);
			expect(y).toBeGreaterThanOrEqual(0.5);
			expect(y).toBeLessThanOrEqual(123.5);
		}
	});

	it("eases into the bite along a lip tangent to both the edge and the bite", () => {
		const d = slabPath(shape);
		// the lip starts on the bottom edge (y = 123.5) at the centre plus dx, and ends on the bite
		const dx = Math.sqrt((26 + 14) ** 2 - (14 + 2) ** 2); // the edge is 2px above the bite's centre
		expect(d).toContain(`H${(200 + dx).toFixed(2).replace(/\.?0+$/, "")}`);
		// the lip's circle is tangent to the bite: its centre is `bite + fillet` from the bite's
		const lipCentre = { x: 200 + dx, y: 123.5 - 14 };
		const biteCentre = { x: 200, y: 124 + 1.5 };
		const apart = Math.hypot(lipCentre.x - biteCentre.x, lipCentre.y - biteCentre.y);
		expect(apart).toBeCloseTo(26 + 14, 5);
	});

	it("is symmetric about the middle", () => {
		const d = slabPath(shape);
		// the bite's two ends are the same distance from the centre line, at the same height
		const arcs = [...d.matchAll(/A26 26 0 0 0 (-?\d+\.?\d*) (-?\d+\.?\d*)/g)];
		expect(arcs).toHaveLength(1);
		const [, left] = arcs[0];
		const right = [...d.matchAll(/A14 14 0 0 1 (-?\d+\.?\d*) (-?\d+\.?\d*)/g)][0];
		expect(200 - Number(left)).toBeCloseTo(Number(right[1]) - 200, 1);
		expect(right[2]).toBe(arcs[0][2]);
	});
});
