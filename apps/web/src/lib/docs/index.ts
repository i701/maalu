import { NAV_ITEMS } from "#/lib/nav";
import { accountPage } from "./account-page";
import { accounts } from "./accounts";
import { budget } from "./budget";
import { fixingRecords } from "./fixing-records";
import { goals } from "./goals";
import { importStatement } from "./import";
import { monthPlan } from "./month-plan";
import { reports } from "./reports";
import { salarySplit } from "./salary-split";
import { subscriptions } from "./subscriptions";
import { varyingBills } from "./varying-bills";
import type { Doc } from "./types";

/** Every guide, in the order the index shows them: setting up, bills, planning, then reports. To add
 * one: write it in its own file here, import it below, and it appears on the Docs page. */
export const DOCS: readonly Doc[] = [
	accounts,
	accountPage,
	importStatement,
	fixingRecords,
	subscriptions,
	varyingBills,
	budget,
	goals,
	monthPlan,
	salarySplit,
	reports,
];

export const findDoc = (slug: string): Doc | undefined => DOCS.find((d) => d.slug === slug);

import type { DocBlock } from "./types";
export type { Doc, DocBlock } from "./types";

/** A piece of a guide's text: plain, **bold**, or a link to a page of the app. `at` is where it
 * starts in the text, so it can be its key. */
export type InlineSegment = { text: string; bold: boolean; href: string | null; at: number };

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

/** A guide's text split into plain, `**bold**` and `[label](/page)` pieces for rendering. */
export function inlineSegments(text: string): InlineSegment[] {
	let at = 0;
	return text
		.split(INLINE)
		.filter((part) => part !== "")
		.map((part) => {
			const start = at;
			at += part.length;
			const link = LINK.exec(part);
			if (link) return { text: link[1], bold: false, href: link[2], at: start };
			if (part.startsWith("**") && part.endsWith("**"))
				return { text: part.slice(2, -2), bold: true, href: null, at: start };
			return { text: part, bold: false, href: null, at: start };
		});
}

/** The pages a guide may link to: every sidebar destination, the pages reached from menus, and the
 * guides themselves. */
export function pageExists(href: string): boolean {
	const fixed = new Set([...NAV_ITEMS.map((i) => i.to), "/settings", "/profile", "/notifications"]);
	if (fixed.has(href)) return true;
	const guide = /^\/docs\/([a-z0-9-]+)$/.exec(href);
	return guide !== null && findDoc(guide[1]) !== undefined;
}

/** A key for a block, made from what it says (a guide never reorders, and no two say the same). */
export function blockKey(block: DocBlock): string {
	switch (block.type) {
		case "h2":
			return `h2:${block.id}`;
		case "p":
			return `p:${block.text}`;
		case "callout":
			return `callout:${block.text}`;
		case "example":
			return `example:${block.title}`;
		case "steps":
		case "list":
			return `${block.type}:${block.items[0]}`;
		case "faq":
			return `faq:${block.items[0]?.q}`;
		case "image":
			return `image:${block.src}`;
		case "demo":
			return `demo:${block.id}`;
	}
}
