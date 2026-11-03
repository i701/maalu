import { describe, expect, it } from "vitest";
import { formatRate, summarize } from "./rates";

const points = [
	{ date: "2026-10-01", rate: "15.40000000" },
	{ date: "2026-10-02", rate: "15.60000000" },
	{ date: "2026-10-03", rate: "15.30000000" },
	{ date: "2026-10-04", rate: "15.55000000" },
];

describe("summarize", () => {
	it("is nothing without points", () => {
		expect(summarize([])).toBeNull();
	});

	it("gives the start, the end, the range and the movement", () => {
		const s = summarize(points)!;
		expect(s.first).toBe(15.4);
		expect(s.last).toBe(15.55);
		expect(s.low).toBe(15.3);
		expect(s.high).toBe(15.6);
		expect(s.change).toBeCloseTo(0.974, 2);
	});

	it("handles a single point", () => {
		const s = summarize([points[0]])!;
		expect(s.change).toBe(0);
		expect(s.low).toBe(s.high);
	});
});

describe("formatRate", () => {
	it("drops needless zeros but keeps the digits that matter", () => {
		expect(formatRate(15.4)).toBe("15.4");
		expect(formatRate(15.39921234)).toBe("15.3992");
		expect(formatRate(0.9)).toBe("0.9");
	});
});
