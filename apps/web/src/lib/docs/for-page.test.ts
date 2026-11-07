import { describe, expect, it } from "vitest";
import { GUIDES_FOR_PAGE, guidesForPath } from "./for-page";
import { findDoc } from "./index";
import { pageExists } from "./index";

describe("GUIDES_FOR_PAGE", () => {
	it("names only guides and pages that exist", () => {
		for (const [page, slugs] of Object.entries(GUIDES_FOR_PAGE)) {
			expect(pageExists(page), page).toBe(true);
			for (const slug of slugs) expect(findDoc(slug), `${page}: ${slug}`).toBeDefined();
		}
	});
});

describe("guidesForPath", () => {
	it("finds the guides for a page", () => {
		expect(guidesForPath("/budget").map((d) => d.slug)).toEqual(["budget", "goals"]);
		expect(guidesForPath("/plan").map((d) => d.slug)).toEqual(["month-plan"]);
	});

	it("ignores a trailing slash", () => {
		expect(guidesForPath("/plan/").map((d) => d.slug)).toEqual(["month-plan"]);
	});

	it("sends any one account's page to its own guide, not the accounts list's", () => {
		expect(guidesForPath("/accounts").map((d) => d.slug)).toEqual(["accounts"]);
		expect(
			guidesForPath("/accounts/6f0c9a52-1111-4222-8333-944455556666").map((d) => d.slug),
		).toEqual(["account-page"]);
	});

	it("has none for a page without a guide, or for the guides themselves", () => {
		expect(guidesForPath("/vendors")).toEqual([]);
		expect(guidesForPath("/docs/budget")).toEqual([]);
		expect(guidesForPath("/")).toEqual([]);
	});
});
