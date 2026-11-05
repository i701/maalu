import type { Accent } from "#/lib/m3";

/**
 * A piece of a guide. Text may use `**bold**` for the name of something on screen (a button, a
 * setting) and `[label](/page)` to link to a page of the app (see `pageExists`), and nothing else:
 * guides stay plain so they read the same everywhere.
 */
export type DocBlock =
	| { type: "h2"; id: string; text: string }
	| { type: "p"; text: string }
	/** Numbered steps, in order */
	| { type: "steps"; items: string[] }
	| { type: "list"; items: string[] }
	| { type: "callout"; tone: "tip" | "note" | "warning"; title?: string; text: string }
	/** A worked example: a title, rows of label and value, and a closing line */
	| { type: "example"; title: string; rows: [string, string][]; note?: string }
	| { type: "faq"; items: { q: string; a: string }[] };

/** A page in the in-app guide. */
export type Doc = {
	/** The address: /docs/<slug> */
	slug: string;
	title: string;
	/** One or two sentences: what the feature is for, shown on the index and under the title */
	summary: string;
	/** Material Symbols name; must exist in the bundled font subset */
	symbol: string;
	accent: Accent;
	/** Where to find the feature in the app, as links at the end of the guide */
	where: { to: string; label: string }[];
	blocks: DocBlock[];
};
