import { describe, expect, it } from "vitest";
import { DOCS } from "./index";
import { docsSearchFor, GUIDE_SEARCH, GUIDES_FOR_PAGE, guidesForPath } from "./for-page";
import { searchDocs } from "./search";
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

describe("docsSearchFor", () => {
	it("gives the term a page's Guides link puts in the docs search, none for a page without guides", () => {
		expect(docsSearchFor("/budget")).toBe("budget");
		expect(docsSearchFor("/budget/")).toBe("budget");
		expect(docsSearchFor("/plan")).toBe("month plan");
		expect(docsSearchFor("/vendors")).toBeNull();
		expect(docsSearchFor("/docs")).toBeNull();
	});

	it("uses one term for an account's own page, whatever its id", () => {
		expect(docsSearchFor("/accounts/6f0c9a52-1111-4222-8333-944455556666")).toBe("account");
	});

	it("finds every guide the page is mapped to, so the docs page lists at least those", () => {
		for (const [page, slugs] of Object.entries(GUIDES_FOR_PAGE)) {
			const term = docsSearchFor(page);
			expect(term, page).not.toBeNull();
			const found = searchDocs(DOCS, term ?? "").map((hit) => hit.doc.slug);
			for (const slug of slugs) expect(found, `${page} -> "${term}"`).toContain(slug);
		}
		const account = searchDocs(DOCS, docsSearchFor("/accounts/abc") ?? "").map((h) => h.doc.slug);
		expect(account).toContain("account-page");
	});

	it("has a term for every page that has guides", () => {
		for (const page of Object.keys(GUIDES_FOR_PAGE)) expect(GUIDE_SEARCH[page], page).toBeTruthy();
	});
});
