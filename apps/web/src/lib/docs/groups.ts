import type { Doc } from "./types";

/** Transaction groups. Keep this in step with the transaction groups paragraph in CLAUDE.md. */
export const groups: Doc = {
	slug: "groups",
	title: "Groups",
	summary:
		"Bundle a handful of related transactions, such as a trip or a purchase paid in instalments, and see what they add up to.",
	symbol: "inventory_2",
	accent: "blue",
	where: [
		{ to: "/groups", label: "Groups: see, edit and delete them" },
		{ to: "/transactions", label: "Transactions: select some and choose Group" },
		{ to: "/docs/tags", label: "Guide: tags, for labels that run across categories" },
	],
	blocks: [
		{
			type: "p",
			text: "A **group** bundles a few transactions under a name and shows what they come to together: a trip paid over several accounts, a treatment bought over weeks, an expense and what a friend paid back. **A group changes nothing else.** The transactions keep their categories, tags and amounts, and every other total ignores groups.",
		},

		{ type: "h2", id: "make", text: "Make a group" },
		{
			type: "steps",
			items: [
				"On [Transactions](/transactions), tick two or more transactions.",
				"Press **Group** in the bar that appears.",
				"Choose **New group**, give it a **Name** (and a **Note** if you like), and press **Make group**. Or pick an existing group and press **Add to group**.",
			],
		},
		{
			type: "p",
			text: "A group holds from 2 to 50 transactions, and a transaction can be in only one group. A transfer, a transaction in the trash or one already in another group cannot be added. The dialog says which.",
		},

		{ type: "h2", id: "reading", text: "Reading a group" },
		{
			type: "p",
			text: "Open the [Groups](/groups) page, or press a group's chip on a transaction. Each group shows how many transactions it has, the dates they span, and three figures in your base currency:",
		},
		{
			type: "example",
			title: "What a group adds up",
			rows: [
				["Money in", "Income in the group (a refund is income, so it lowers the net)"],
				["Money out", "Expenses in the group"],
				["Net", "Money in less money out"],
			],
			note: "Only posted transactions are counted. A planned one is not, and a trashed one comes back counted if you restore it.",
		},

		{ type: "h2", id: "change", text: "Changing a group" },
		{
			type: "list",
			items: [
				"**Edit** renames it or changes its note.",
				"Press **Take out of the group** beside a transaction to remove it from the group. The transaction itself is untouched.",
				"**Delete** removes the group and only unlinks its transactions.",
				"A group left with fewer than two transactions is deleted for you, and the page tells you when that happens. The same happens when one of its transactions is deleted for good or turned into a transfer.",
			],
		},

		{
			type: "faq",
			items: [
				{
					q: "Group or tag?",
					a: "A group is a fixed handful with a summary and a name. A tag is a label you can put on as many transactions as you like and filter by (see [Tags](/docs/tags)). Use a group when you want the total shown for you.",
				},
				{
					q: "Can I filter Transactions by group?",
					a: "Not yet. The group's own page lists its transactions instead.",
				},
			],
		},
	],
};
