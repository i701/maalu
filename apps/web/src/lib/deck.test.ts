import { describe, expect, it } from "vitest";
import { keptSplit } from "./deck";

describe("keptSplit", () => {
	it("splits income into kept and spent", () => {
		expect(keptSplit(0, 10)).toBeNull();
		expect(keptSplit(100, 25)).toEqual({ keptShare: 0.75, spentShare: 0.25 });
		expect(keptSplit(100, 150)).toEqual({ keptShare: 0, spentShare: 1 });
	});
});
