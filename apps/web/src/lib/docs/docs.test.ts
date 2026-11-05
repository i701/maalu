import { describe, expect, it } from "vitest";
import { blockKey, DOCS, findDoc, inlineSegments, pageExists } from "./index";

describe("inlineSegments", () => {
	it("splits bold from plain text", () => {
		expect(inlineSegments("Press **Save** now")).toEqual([
			{ text: "Press ", bold: false, href: null, at: 0 },
			{ text: "Save", bold: true, href: null, at: 6 },
			{ text: " now", bold: false, href: null, at: 14 },
		]);
	});

	it("handles text with no bold, and bold at the ends", () => {
		expect(inlineSegments("plain")).toEqual([{ text: "plain", bold: false, href: null, at: 0 }]);
		expect(inlineSegments("**A** and **B**")).toEqual([
			{ text: "A", bold: true, href: null, at: 0 },
			{ text: " and ", bold: false, href: null, at: 5 },
			{ text: "B", bold: true, href: null, at: 10 },
		]);
		expect(inlineSegments("")).toEqual([]);
	});
});

describe("links in a guide", () => {
	it("are pulled out of the text with their address", () => {
		expect(inlineSegments("Open [Settings](/settings) and press **Save**.")).toEqual([
			{ text: "Open ", bold: false, href: null, at: 0 },
			{ text: "Settings", bold: false, href: "/settings", at: 5 },
			{ text: " and press ", bold: false, href: null, at: 26 },
			{ text: "Save", bold: true, href: null, at: 37 },
			{ text: ".", bold: false, href: null, at: 45 },
		]);
	});

	it("only go to pages that exist", () => {
		expect(pageExists("/settings")).toBe(true);
		expect(pageExists("/plan")).toBe(true);
		expect(pageExists("/docs/salary-split")).toBe(true);
		expect(pageExists("/docs/nope")).toBe(false);
		expect(pageExists("/nowhere")).toBe(false);
		expect(pageExists("https://example.com")).toBe(false);
	});
});

describe("the guides", () => {
	it("have unique addresses, found by slug", () => {
		const slugs = DOCS.map((d) => d.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const doc of DOCS) expect(findDoc(doc.slug)).toBe(doc);
		expect(findDoc("nope")).toBeUndefined();
	});

	it("have headings with unique ids, so every link on the page lands", () => {
		for (const doc of DOCS) {
			const ids = doc.blocks.flatMap((b) => (b.type === "h2" ? [b.id] : []));
			expect(new Set(ids).size, doc.slug).toBe(ids.length);
			for (const id of ids) expect(id, doc.slug).toMatch(/^[a-z0-9-]+$/);
		}
	});

	it("balance their bold markers, and link only to pages that exist", () => {
		const texts = (doc: (typeof DOCS)[number]) =>
			doc.blocks.flatMap((b) => {
				if (b.type === "p" || b.type === "callout") return [b.text];
				if (b.type === "steps" || b.type === "list") return b.items;
				if (b.type === "faq") return b.items.flatMap((i) => [i.q, i.a]);
				if (b.type === "example") return [...b.rows.flat(), ...(b.note ? [b.note] : [])];
				return [];
			});
		for (const doc of DOCS)
			for (const t of [doc.summary, ...texts(doc)]) {
				expect(t.split("**").length % 2, `${doc.slug}: ${t.slice(0, 40)}`).toBe(1);
				for (const seg of inlineSegments(t))
					if (seg.href) expect(pageExists(seg.href), `${doc.slug}: ${seg.href}`).toBe(true);
				// a bracket that did not become a link is a typo
				expect(
					t.replace(/\[[^\]]+\]\([^)\s]+\)/g, ""),
					`${doc.slug}: ${t.slice(0, 40)}`,
				).not.toMatch(/\]\(/);
			}
	});

	it("have no two blocks, or two items in a list, with the same text, since that text is the key", () => {
		for (const doc of DOCS) {
			const keys = doc.blocks.map(blockKey);
			expect(new Set(keys).size, `${doc.slug} blocks`).toBe(keys.length);
			for (const b of doc.blocks) {
				const items =
					b.type === "steps" || b.type === "list"
						? b.items
						: b.type === "faq"
							? b.items.map((i) => i.q)
							: b.type === "example"
								? b.rows.map((r) => r[0])
								: [];
				expect(new Set(items).size, `${doc.slug} ${b.type}`).toBe(items.length);
			}
		}
	});

	it("point their links at real pages", () => {
		for (const doc of DOCS) for (const w of doc.where) expect(pageExists(w.to), w.to).toBe(true);
	});
});
