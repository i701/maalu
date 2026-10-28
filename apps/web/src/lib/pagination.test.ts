import { describe, expect, it } from "vitest";
import { lastPageIfOutOfRange } from "./pagination";

describe("lastPageIfOutOfRange", () => {
	it("is null while the page has rows", () => {
		expect(lastPageIfOutOfRange({ page: 2, pageSize: 20, total: 45, itemCount: 20 })).toBeNull();
	});

	it("points at the last page with rows after the last row of the last page is gone", () => {
		expect(lastPageIfOutOfRange({ page: 3, pageSize: 20, total: 40, itemCount: 0 })).toBe(2);
		expect(lastPageIfOutOfRange({ page: 5, pageSize: 10, total: 21, itemCount: 0 })).toBe(3);
	});

	it("is null on the first page and when nothing exists at all", () => {
		expect(lastPageIfOutOfRange({ page: 1, pageSize: 20, total: 0, itemCount: 0 })).toBeNull();
		expect(lastPageIfOutOfRange({ page: 2, pageSize: 20, total: 0, itemCount: 0 })).toBeNull();
	});
});
