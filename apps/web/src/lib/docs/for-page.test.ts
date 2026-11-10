import { describe, expect, it } from "vitest";
import { docsFilterFor, GUIDES_FOR_PAGE, guidesForPath, pageLabel } from "./for-page";
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

describe("docsFilterFor", () => {
	it("gives the filter a page's Guides link sends, and none for a page without guides", () => {
		expect(docsFilterFor("/budget")).toBe("/budget");
		expect(docsFilterFor("/budget/")).toBe("/budget");
		expect(docsFilterFor("/vendors")).toBeNull();
		expect(docsFilterFor("/docs")).toBeNull();
	});

	it("uses one key for an account's own page, whatever its id", () => {
		expect(docsFilterFor("/accounts/6f0c9a52-1111-4222-8333-944455556666")).toBe("/accounts/page");
		expect(guidesForPath("/accounts/page").map((d) => d.slug)).toEqual(["account-page"]);
	});

	it("shows more than one guide for a page that has more", () => {
		expect(guidesForPath(docsFilterFor("/budget") ?? "").length).toBeGreaterThan(1);
	});
});

describe("pageLabel", () => {
	it("names the page in words", () => {
		expect(pageLabel("/budget")).toBe("Budget");
		expect(pageLabel("/settings")).toBe("Settings");
		expect(pageLabel("/accounts/page")).toBe("an account's page");
		expect(pageLabel("/nowhere")).toBe("this page");
	});
});
