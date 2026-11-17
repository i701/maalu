import { describe, expect, it } from "vitest";
import { fitView, MAX_SCALE, MIN_SCALE, zoomAt } from "./pan-zoom";

describe("zoomAt", () => {
	it("keeps the content under the pointer where it is", () => {
		const view = { scale: 1, x: 40, y: 20 };
		const next = zoomAt(view, 2, 300, 200);
		// the content point under (300, 200) before and after
		expect((300 - view.x) / view.scale).toBeCloseTo((300 - next.x) / next.scale);
		expect((200 - view.y) / view.scale).toBeCloseTo((200 - next.y) / next.scale);
		expect(next.scale).toBe(2);
	});

	it("stops at the smallest and the largest scale", () => {
		expect(zoomAt({ scale: 1, x: 0, y: 0 }, 100, 0, 0).scale).toBe(MAX_SCALE);
		expect(zoomAt({ scale: 1, x: 0, y: 0 }, 0.001, 0, 0).scale).toBe(MIN_SCALE);
	});
});

describe("fitView", () => {
	it("shrinks content that is too big and centres it", () => {
		const view = fitView({ width: 1200, height: 600 }, { width: 600, height: 800 }, 0);
		expect(view.scale).toBeCloseTo(0.5);
		expect(view.x).toBeCloseTo(0);
		expect(view.y).toBeCloseTo(250);
	});

	it("never enlarges content that already fits", () => {
		const view = fitView({ width: 300, height: 200 }, { width: 900, height: 700 }, 0);
		expect(view.scale).toBe(1);
		expect(view.x).toBe(300);
	});
});
