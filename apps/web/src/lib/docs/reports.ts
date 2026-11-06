import type { Doc } from "./types";

/** Compare, Trends, Net worth and needs and wants. Keep this in step with the Compare, Trends, Net
 * worth drivers and Needs and wants paragraphs in CLAUDE.md. */
export const reports: Doc = {
	slug: "reports",
	title: "Reports: compare, trends and net worth",
	summary:
		"See how this month went against the last, how each category moves over a year, what changed your net worth, and how much of your spending was needs and how much wants.",
	symbol: "insights",
	accent: "violet",
	where: [
		{ to: "/compare", label: "Compare: one period against another" },
		{ to: "/trends", label: "Trends: every category, month by month" },
		{ to: "/net-worth", label: "Net worth: what moved it" },
		{ to: "/categories", label: "Categories: sort them into needs and wants" },
	],
	blocks: [
		{
			type: "p",
			text: "All the reports count money the same way, so their figures agree with each other and with the [dashboard](/dashboard):",
		},
		{
			type: "list",
			items: [
				"Transfers between your accounts are neither income nor spending.",
				"A refund takes away from spending in its category, in the month it arrived. A month with big refunds can even show spending below zero.",
				"Planned transactions, the Trash, balance adjustments and accounts left out of totals are not counted.",
				"Amounts are in your base currency, at the rate each transaction was saved with.",
			],
		},

		{ type: "h2", id: "compare", text: "Compare" },
		{
			type: "p",
			text: "[Compare](/compare) holds one period against another: what you earned, spent and kept in each, then every category with how far it moved, the biggest change first. A sentence at the top sums it up.",
		},
		{
			type: "list",
			items: [
				"Pick a period: **Last month** against the month before (the default), **This month** against last month, **Last 30 days** against the 30 days before, **This year** so far against the same days last year, or **Custom** for any two date ranges.",
				"Green means better: spending down or income up. Every change also has an arrow, so you don't need the colour to read it.",
				"A category marked **new** had nothing in the earlier period, so it has no percentage.",
				"**This month** is still running, so it is usually lower than a full month. The page reminds you.",
			],
		},

		{ type: "h2", id: "trends", text: "Trends" },
		{
			type: "p",
			text: "[Trends](/trends) puts every category in a row and every month in a column, with a total and a monthly average for each. Choose **Spending** or **Income** and 6, 12 or 24 months. The darker a figure, the bigger it is compared with the rest of the table, and every cell shows its number.",
		},
		{
			type: "p",
			text: "Switch to the chart to see the same months as stacked columns: the six biggest categories, with the rest grouped as Other. The chart can't draw a negative figure, so a month where refunds beat spending is drawn as zero; the table has the exact number.",
		},

		{ type: "h2", id: "net-worth", text: "Net worth" },
		{
			type: "p",
			text: "Net worth is what your accounts hold, less what you owe on cards and loans. [Net worth](/net-worth) shows where it stood at the start of a period, where it ended, and what moved it, as a chart of steps that add up exactly to the change:",
		},
		{
			type: "list",
			items: [
				"**Income**: money that came in, not counting refunds.",
				"**Spending**: money that went out, less what refunds gave back.",
				"**Balance adjustments**: corrections that made an account match its bank.",
				"**Transfers across net worth**: money moved to or from an account that is not part of net worth (archived, or left out of totals). A transfer between two accounts that both count changes nothing.",
				"**Exchange rates**: accounts in another currency are worth a different amount in your base currency when their rate changes.",
			],
		},
		{
			type: "example",
			title: "Example: a month",
			rows: [
				["At the start", "MVR 52,000"],
				["Income", "+ 20,000"],
				["Spending", "− 14,500"],
				["Exchange rates", "+ 120 (your dollar account is worth a little more)"],
				["At the end", "MVR 57,620, a change of + 5,620"],
			],
		},
		{
			type: "callout",
			tone: "note",
			text: "Net worth leaves out archived accounts and accounts left out of totals, so its income and spending can differ a little from the dashboard's, which still count transactions in archived accounts.",
		},

		{ type: "h2", id: "needs-and-wants", text: "Needs and wants" },
		{
			type: "p",
			text: "Each category can be marked a **need** (rent, groceries, the electricity bill) or a **want** (eating out, games). Sub-categories follow their parent unless you set them, so Food can be a need while Food › Dining is a want.",
		},
		{
			type: "steps",
			items: [
				"Open [Categories](/categories) and press **Needs and wants** (it says how many are not sorted yet).",
				"Choose Need or Want for each category. **Not set** leaves it unsorted.",
				"Press **Save**.",
			],
		},
		{
			type: "p",
			text: "The **Needs and wants** card on the [dashboard](/dashboard) then splits the month's spending into the two, with anything unsorted shown on its own. [Compare](/compare) and [Trends](/trends) have a needs and wants section too.",
		},
	],
};
