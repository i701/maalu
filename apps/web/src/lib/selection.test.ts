import { describe, expect, it } from "vitest";
import { selectionState, toggleAll, toggleId } from "./selection";

const ids = ["a", "b", "c"];

describe("toggleId", () => {
	it("adds an id that is not selected and removes one that is", () => {
		expect([...toggleId(new Set(), "a")]).toEqual(["a"]);
		expect([...toggleId(new Set(["a", "b"]), "a")]).toEqual(["b"]);
	});

	it("does not change the set it was given", () => {
		const before = new Set(["a"]);
		toggleId(before, "b");
		expect([...before]).toEqual(["a"]);
	});
});

describe("selectionState", () => {
	it("is none, some or all of the rows on screen", () => {
		expect(selectionState(new Set(), ids)).toBe("none");
		expect(selectionState(new Set(["a"]), ids)).toBe("some");
		expect(selectionState(new Set(ids), ids)).toBe("all");
	});

	it("ignores selected ids that are no longer on screen", () => {
		expect(selectionState(new Set(["gone"]), ids)).toBe("none");
		expect(selectionState(new Set(["a", "gone"]), ids)).toBe("some");
	});

	it("is none for an empty list", () => {
		expect(selectionState(new Set(), [])).toBe("none");
	});
});

describe("toggleAll", () => {
	it("selects everything unless everything is already selected", () => {
		expect([...toggleAll(new Set(), ids)]).toEqual(ids);
		expect([...toggleAll(new Set(["a"]), ids)]).toEqual(ids);
		expect([...toggleAll(new Set(ids), ids)]).toEqual([]);
	});
});
