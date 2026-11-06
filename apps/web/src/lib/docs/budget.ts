import type { Doc } from "./types";

/** Spending limits, per period or for set dates. Keep this in step with the budget paragraph in
 * CLAUDE.md. */
export const budget: Doc = {
	slug: "budget",
	title: "Budget and spending limits",
	summary:
		"Set a limit on what you spend in some categories each month, or once for a trip or a season, and see how much is left before you go over.",
	symbol: "savings",
	accent: "amber",
	where: [
		{ to: "/budget", label: "Budget: your limits and savings goals" },
		{ to: "/categories", label: "Categories: what a limit counts" },
		{ to: "/transactions", label: "Transactions: warnings when you save an expense" },
		{ to: "/docs/goals", label: "Guide: savings goals" },
	],
	blocks: [
		{
			type: "p",
			text: "A budget in Maalu is a set of **limits**. Each one says how much you mean to spend on some categories, and the [Budget](/budget) page shows what you have spent against it and what is left. Nothing is moved between accounts: a limit only watches your spending.",
		},

		{ type: "h2", id: "add-a-limit", text: "Add a limit" },
		{
			type: "steps",
			items: [
				"Open [Budget](/budget) and press **Add limit**.",
				"Give it a **Name**, such as Food and drink.",
				"Choose the **Categories** it covers. Spending in any of them counts against the limit. A category can be in only one monthly limit.",
				"Enter the **Limit per period**, for example 4,000.",
				"Optionally set **Warn at (%)** for this limit alone, and switch on **Carry unspent money into the next period** if you want leftovers to roll over.",
				"Press **Save**.",
			],
		},
		{
			type: "p",
			text: "Choosing a parent category includes its sub-categories, so a limit on Food also counts Food › Dining. A purchase split into items counts each item under its own category.",
		},

		{ type: "h2", id: "periods", text: "Periods" },
		{
			type: "p",
			text: "A period is a month. By default it is a calendar month, but if you are paid on the 25th you can line periods up with your pay: press the **Budget settings** button at the top of the page and set **A period starts on day**. The arrows beside the period name show earlier and later periods.",
		},

		{ type: "h2", id: "reading-it", text: "Reading a limit" },
		{
			type: "list",
			items: [
				"**Left** is the limit, plus anything carried over or moved in, less anything moved out and what you spent. When you have spent more, the card says **Over by** instead.",
				"A limit turns to a warning once you have spent the **Warn at** share of it (80% unless you change it in **Budget settings** or on the limit), and to over once you pass it.",
				"Only expenses count. Income and transfers between your accounts never do, and a refund gives back what it refunds.",
				"Planned transactions count nothing until they are paid.",
			],
		},
		{
			type: "example",
			title: "Example: groceries with rollover",
			rows: [
				["Limit per period", "MVR 4,000"],
				["Spent last month", "MVR 3,600, so 400 unspent"],
				["Carried into this month", "MVR 400"],
				["Spent so far this month", "MVR 2,900"],
				["Left", "4,000 + 400 − 2,900 = MVR 1,500"],
			],
			note: "Rollover only carries unspent money forward. Overspending one month does not take anything away from the next.",
		},

		{ type: "h2", id: "move-money", text: "Move money between limits" },
		{
			type: "p",
			text: "Running tight on one limit while another has room? Move some across for this period instead of raising the limit for good. Your overall budget stays the same: you have only decided differently where the money goes.",
		},
		{
			type: "steps",
			items: [
				"On [Budget](/budget), press **Move money here** on the limit that needs more.",
				"Choose where it comes **From**. Each limit shows what it has left, and the one with the most is picked for you.",
				"Enter the amount and, if you like, a note, and press **Move**.",
			],
		},
		{
			type: "example",
			title: "Example: guests for the weekend",
			rows: [
				["Groceries", "MVR 4,000, with 3,600 spent"],
				["Eating out", "MVR 2,000, with 200 spent"],
				["You move", "MVR 600 from Eating out to Groceries"],
				["Groceries this period", "4,600, so MVR 1,000 left"],
				["Eating out this period", "1,400, so MVR 1,200 left"],
			],
			note: "Next period both are back to 4,000 and 2,000.",
		},
		{
			type: "list",
			items: [
				"A limit can give at most what it has left this period. Money already spent can't be moved.",
				"With nothing to take from, choose **Nowhere: just add to this limit**. That raises this period's budget instead of shifting it.",
				"Each card lists the moves into and out of it this period. Press **Undo** beside one to take it back.",
				"**History** on a card lists every move into or out of that limit, in every period: what moved where, the note, when it was made, and whether it was undone. Undone moves stay in the history, marked, so you can always see what happened.",
				"A move only applies to the period you were looking at, but rollover carries what was left after it.",
				"Money moves only between monthly limits, not limits for set dates.",
			],
		},

		{ type: "h2", id: "set-dates", text: "A limit for set dates" },
		{
			type: "p",
			text: "Some spending is not monthly: a trip, Ramadan, a wedding. For those, switch on **Only for certain dates** when adding a limit and choose **From** and **Until**. The amount becomes the **Limit for these dates**: one total for the whole stretch, not a monthly figure.",
		},
		{
			type: "list",
			items: [
				"These limits are listed under **For set dates**, below the monthly ones, with their dates and how many days are left. They are not in the totals at the top.",
				"A limit for set dates may share categories with a monthly one, so a holiday limit can cover Food while your monthly Food limit keeps counting too. Two limits for set dates can't share a category on the same days.",
				"Rollover does not apply to them.",
			],
		},

		{ type: "h2", id: "warnings", text: "Warnings" },
		{
			type: "p",
			text: "When you save an expense on [Transactions](/transactions) that brings a limit close to or past what you set, the confirmation tells you. The Transactions page also shows a strip while any limit needs attention, and the bell in the top bar notifies you once per limit and period (you can turn this off in [Settings](/settings)).",
		},
		{
			type: "callout",
			tone: "tip",
			text: "Saving toward something, rather than limiting spending? That is a goal, not a limit. See [Savings goals](/docs/goals).",
		},
	],
};
