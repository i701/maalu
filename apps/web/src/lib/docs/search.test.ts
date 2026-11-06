import { describe, expect, it } from "vitest";
import { DOCS } from "./index";
import { excerpt, plainText, searchDocs } from "./search";
import type { Doc } from "./types";

const doc = (slug: string, title: string, summary: string, blocks: Doc["blocks"]): Doc => ({
	slug,
	title,
	summary,
	symbol: "article",
	accent: "blue",
	where: [],
	blocks,
});

const rent = doc("rent", "Paying rent", "Your landlord, every month.", [
	{ type: "p", text: "Rent is due on the first." },
	{ type: "h2", id: "late", text: "When you are late" },
	{
		type: "p",
		text: "Press **Mark as paid** on [Month plan](/plan) once the transfer has gone out.",
	},
]);
const salary = doc("salary", "Salary", "Split your pay.", [
	{ type: "h2", id: "rules", text: "Rules" },
	{ type: "list", items: ["A rule can move rent money to savings.", "Another rule fills a goal."] },
]);
const docs = [salary, rent];

describe("plainText", () => {
	it("drops bold markers and keeps a link's label", () => {
		expect(plainText("Press **Save** on [Budget](/budget).")).toBe("Press Save on Budget.");
	});
});

describe("searchDocs", () => {
	it("returns every guide unchanged for an empty query", () => {
		expect(searchDocs(docs, "  ").map((h) => h.doc.slug)).toEqual(["salary", "rent"]);
		expect(searchDocs(docs, "").every((h) => h.snippet === null)).toBe(true);
	});

	it("needs every word, in any order and case", () => {
		expect(searchDocs(docs, "PAID mark").map((h) => h.doc.slug)).toEqual(["rent"]);
		expect(searchDocs(docs, "paid goal")).toEqual([]);
	});

	it("puts a title match first", () => {
		expect(searchDocs(docs, "rent").map((h) => h.doc.slug)).toEqual(["rent", "salary"]);
	});

	it("searches the text a reader sees, not the markup", () => {
		expect(searchDocs(docs, "month plan").map((h) => h.doc.slug)).toEqual(["rent"]);
		expect(searchDocs(docs, "/plan")).toEqual([]);
	});

	it("points at the section and passage for a match in the body", () => {
		const [hit] = searchDocs(docs, "transfer");
		expect(hit.section).toEqual({ id: "late", text: "When you are late" });
		expect(hit.snippet).toBe("Press Mark as paid on Month plan once the transfer has gone out.");
	});

	it("shows no passage when the title or summary already explain the match", () => {
		const [hit] = searchDocs(docs, "landlord");
		expect(hit.doc.slug).toBe("rent");
		expect(hit.snippet).toBeNull();
		expect(hit.section).toBeNull();
	});

	it("searches the real guides, including example rows", () => {
		// "Charged in MVR 186" is only in an example row of the varying bills guide
		expect(searchDocs(DOCS, "MVR 186").map((h) => h.doc.slug)).toContain("varying-bills");
		expect(searchDocs(DOCS, "refund").length).toBeGreaterThan(0);
		expect(searchDocs(DOCS, "zzzz-not-a-word")).toEqual([]);
	});
});

describe("excerpt", () => {
	it("keeps short text whole", () => {
		expect(excerpt("short text", 3)).toBe("short text");
	});

	it("cuts long text around the match at word boundaries", () => {
		const long = `${"word ".repeat(60)}target ${"tail ".repeat(60)}`.trim();
		const cut = excerpt(long, long.indexOf("target"));
		expect(cut.startsWith("…")).toBe(true);
		expect(cut.endsWith("…")).toBe(true);
		expect(cut).toContain("target");
		expect(cut.length).toBeLessThanOrEqual(162);
	});
});
