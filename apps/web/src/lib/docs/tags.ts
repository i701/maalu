import type { Doc } from "./types";

/** Tags: labels that cut across categories. Keep this in step with the tags paragraph in CLAUDE.md. */
export const tags: Doc = {
	slug: "tags",
	title: "Tags",
	summary:
		"Labels that cut across categories, like Trip or Reimbursable: how to add them, filter by them and keep them tidy.",
	symbol: "sell",
	accent: "violet",
	where: [
		{ to: "/tags", label: "Tags: rename, merge and delete them" },
		{ to: "/transactions", label: "Transactions: add tags and filter by them" },
		{ to: "/templates", label: "Templates: a template can carry tags" },
	],
	blocks: [
		{
			type: "p",
			text: "A **tag** is a label you put on a transaction, such as Trip, Gift or Reimbursable. A category answers what the money was for. A tag answers something else that can cut across categories: a trip has food, transport and a hotel, and one tag gathers them. A transaction can have up to 10 tags.",
		},

		{ type: "h2", id: "adding", text: "Adding tags" },
		{
			type: "steps",
			items: [
				"On a [transaction](/transactions), type in the **Tags** field and press Enter. A tag that does not exist yet is made for you.",
				"Add as many as you need, up to 10.",
				"Save the transaction. Its tags show as coloured chips on the row.",
			],
		},
		{
			type: "p",
			text: "A tag belongs to the whole transaction, never to one item of a split purchase. You can also add a tag on the [Tags](/tags) page with **Add tag**. Each tag gets a colour automatically, the least used one first.",
		},

		{ type: "h2", id: "filtering", text: "Finding transactions by tag" },
		{
			type: "p",
			text: "Open the filters on [Transactions](/transactions) and choose one or more tags. By default a transaction needs **any** of them. Turn on **Must have all of them** to require every chosen tag. A transaction with several of the chosen tags still counts once in the totals, and the export has a Tags column.",
		},
		{
			type: "example",
			title: "Example: a trip",
			rows: [
				["Tag", "Trip"],
				["Flights", "Category Travel, tagged Trip"],
				["Hotel", "Category Accommodation, tagged Trip"],
				["Dinner out", "Category Eating out, tagged Trip"],
				["Filter by Trip", "All three, whatever their categories, with their total"],
			],
			note: "For a fixed bundle you want to see added up on its own, a [group](/docs/groups) can be better: it is a named handful of transactions with a summary.",
		},

		{ type: "h2", id: "tidy", text: "Keeping them tidy" },
		{
			type: "list",
			items: [
				"**Rename** a tag and everything with it is renamed.",
				"**Merge** one tag into another: its transactions and templates get the other tag instead, without duplicates, and the first is removed.",
				"**Delete** only takes the tag off the transactions that have it. It never blocks, and no transaction is changed otherwise.",
			],
		},
		{
			type: "p",
			text: "A [template](/templates) can carry tags, and a vendor can have usual tags that the transaction form fills in when you pick it (see the Vendors page). Tags you type are matched ignoring case, so **trip** and **Trip** are one tag.",
		},

		{
			type: "faq",
			items: [
				{
					q: "Tag or category?",
					a: "Use a category for what the money was for, since the budget and reports add up by it. Use a tag for something that runs across categories, like one trip or one project.",
				},
				{
					q: "Does a tag change my budget?",
					a: "No. Budgets work on categories. Tags only help you find and add up transactions.",
				},
			],
		},
	],
};
