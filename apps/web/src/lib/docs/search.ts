import type { Doc, DocBlock } from "./types";

/** A guide that matched a search, and where in it: the section and a passage from the body when
 * the words were found there rather than only in the title or summary. */
export type DocHit = {
	doc: Doc;
	section: { id: string; text: string } | null;
	snippet: string | null;
};

const SNIPPET = 160;

/** The text a reader sees: link markup becomes its label and `**` goes. */
export const plainText = (text: string): string =>
	text.replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1").replace(/\*\*/g, "");

const fold = (text: string) => plainText(text).toLowerCase();

/** Every piece of readable text in a block. */
function blockTexts(block: DocBlock): string[] {
	switch (block.type) {
		case "h2":
		case "p":
			return [block.text];
		case "steps":
		case "list":
			return block.items;
		case "callout":
			return block.title ? [block.title, block.text] : [block.text];
		case "example":
			return [block.title, ...block.rows.flat(), ...(block.note ? [block.note] : [])];
		case "faq":
			return block.items.flatMap((item) => [item.q, item.a]);
		case "image":
			return block.caption ? [block.alt, block.caption] : [block.alt];
	}
}

/** About `SNIPPET` characters of `text` around position `at`, cut at word boundaries. */
export function excerpt(text: string, at: number): string {
	if (text.length <= SNIPPET) return text;
	let start = Math.max(0, at - SNIPPET / 3);
	if (start > 0) start = text.indexOf(" ", start) + 1 || start;
	let end = Math.min(text.length, start + SNIPPET);
	if (end < text.length)
		end = text.lastIndexOf(" ", end) > start ? text.lastIndexOf(" ", end) : end;
	return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

/**
 * The guides that contain every word of `query` (in any order, ignoring case and formatting),
 * best first: words in the title count most, then the summary, then how often the body mentions
 * them. Ties keep the guides' own order. An empty query returns every guide as it is.
 */
export function searchDocs(docs: readonly Doc[], query: string): DocHit[] {
	const words = fold(query).split(/\s+/).filter(Boolean);
	if (words.length === 0) return docs.map((doc) => ({ doc, section: null, snippet: null }));

	const hits: { hit: DocHit; score: number }[] = [];
	for (const doc of docs) {
		const title = fold(doc.title);
		const summary = fold(doc.summary);
		let section: DocHit["section"] = null;
		const passages: { section: DocHit["section"]; text: string; folded: string }[] = [];
		for (const block of doc.blocks) {
			if (block.type === "h2") section = { id: block.id, text: block.text };
			for (const text of blockTexts(block)) {
				const shown = plainText(text);
				passages.push({ section, text: shown, folded: shown.toLowerCase() });
			}
		}
		const everything = [title, summary, ...passages.map((p) => p.folded)].join("\n");
		if (!words.every((w) => everything.includes(w))) continue;

		const inBody = passages.filter((p) => words.some((w) => p.folded.includes(w)));
		const score =
			words.filter((w) => title.includes(w)).length * 10 +
			words.filter((w) => summary.includes(w)).length * 3 +
			inBody.length;

		// Point at the body only when the title and summary alone don't explain the match.
		const headerHasAll = words.every((w) => title.includes(w) || summary.includes(w));
		const best = headerHasAll
			? undefined
			: inBody.reduce<(typeof inBody)[number] | undefined>((top, p) => {
					const count = (x: typeof p) => words.filter((w) => x.folded.includes(w)).length;
					return !top || count(p) > count(top) ? p : top;
				}, undefined);
		const first = best
			? Math.min(...words.map((w) => best.folded.indexOf(w)).filter((i) => i >= 0))
			: 0;
		hits.push({
			hit: {
				doc,
				section: best?.section ?? null,
				snippet: best ? excerpt(best.text, first) : null,
			},
			score,
		});
	}
	// Sorting is stable, so equal scores keep the guides' order.
	return hits.toSorted((a, b) => b.score - a.score).map((h) => h.hit);
}
