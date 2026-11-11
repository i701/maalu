import type { Doc, DocBlock } from "./types";

/**
 * The guides as plain JSON for the Android app, which bundles them (`apps/android/app/src/main/assets/docs.json`)
 * instead of fetching them: the web guides stay the single source and the app reads them offline.
 *
 * Only what a native screen can draw goes in. The blocks that are made of web components (a live example
 * drawn with `demo`, a screenshot) are left out and named in `extras`, so the app can say the guide has more
 * on the web. Text keeps its `**bold**` and `[label](/page)` markup; the app turns links into screens.
 */
export type AndroidBlock =
	| { type: "h2"; id: string; text: string }
	| { type: "p"; text: string }
	| { type: "steps" | "list"; items: string[] }
	| { type: "callout"; tone: "tip" | "note" | "warning"; title?: string; text: string }
	| { type: "example"; title: string; rows: [string, string][]; note?: string }
	| { type: "faq"; faq: { q: string; a: string }[] };

export type AndroidDoc = {
	slug: string;
	title: string;
	summary: string;
	accent: string;
	where: { to: string; label: string }[];
	blocks: AndroidBlock[];
	/** What the web guide has that this copy leaves out, one line each */
	extras: string[];
	/** The feature is only in the web app */
	webOnly: boolean;
};

export type AndroidDocs = { version: 1; docs: AndroidDoc[] };

/** Guides about something the Android app deliberately does not do, so the app says it is a web feature (Import: reviewing a whole statement is a desktop job). */
export const WEB_ONLY = new Set(["import"]);

function convert(block: DocBlock): AndroidBlock | string {
	switch (block.type) {
		case "h2":
			return { type: "h2", id: block.id, text: block.text };
		case "p":
			return { type: "p", text: block.text };
		case "steps":
		case "list":
			return { type: block.type, items: [...block.items] };
		case "callout":
			return {
				type: "callout",
				tone: block.tone,
				...(block.title ? { title: block.title } : {}),
				text: block.text,
			};
		case "example":
			return {
				type: "example",
				title: block.title,
				rows: block.rows.map(([a, b]) => [a, b] as [string, string]),
				...(block.note ? { note: block.note } : {}),
			};
		case "faq":
			return { type: "faq", faq: block.items.map(({ q, a }) => ({ q, a })) };
		case "demo":
			return `Live example: ${block.title}`;
		case "image":
			return `Screenshot: ${block.alt}`;
	}
}

export function exportDocs(docs: readonly Doc[]): AndroidDocs {
	return {
		version: 1,
		docs: docs.map((doc) => {
			const blocks: AndroidBlock[] = [];
			const extras: string[] = [];
			for (const block of doc.blocks) {
				const out = convert(block);
				if (typeof out === "string") extras.push(out);
				else blocks.push(out);
			}
			return {
				slug: doc.slug,
				title: doc.title,
				summary: doc.summary,
				accent: doc.accent,
				where: doc.where.map(({ to, label }) => ({ to, label })),
				blocks,
				extras,
				webOnly: WEB_ONLY.has(doc.slug),
			};
		}),
	};
}

/** The file's exact text, so what is committed and what is generated compare byte for byte. */
export const docsJson = (docs: readonly Doc[]): string =>
	`${JSON.stringify(exportDocs(docs), null, "\t")}\n`;
