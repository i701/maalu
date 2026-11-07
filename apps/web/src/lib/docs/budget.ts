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
			type: "demo",
			id: "budget-limits",
			title: "the Budget page's summary and limits",
			caption:
				"The summary and four limits, with made-up figures: two on track, one close to its limit and one over. The Needs and Wants chips come from the categories in each limit.",
		},
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
				"The card of a running or finished one has **Repeat for the next stretch**: it opens the form filled in with the same name, categories and amount, starting the day after and lasting as long. Change anything you like and save.",
				"A limit for set dates is only listed under the period whose dates it touches, so a November limit is not shown while you look at December. The dashboard's budget card lists the ones that are running.",
			],
		},

		{ type: "h2", id: "between-dates", text: "A monthly limit between two dates" },
		{
			type: "p",
			text: "Sometimes a limit is monthly but only for a while: a food budget for November to January. After switching on **Only for certain dates**, set **How it counts** to **A limit for every period between these dates**. The amount is then **per period**, as usual (and rollover works inside the dates), but the limit only exists in the periods the dates touch. Periods are whole, so the dates snap to them: from 15 Nov to 10 Jan runs 1 Nov to 31 Jan.",
		},
		{
			type: "list",
			items: [
				"It sits with the other monthly limits, counts in their totals while it runs, and shows **Runs 01 Nov 2026 – 31 Jan 2027** on its card. Before and after those periods it is not there.",
				"The same category can be in two such limits as long as they run at different times. It can't be in one that runs for ever, or in one that overlaps.",
			],
		},

		{ type: "h2", id: "needs-wants", text: "Needs and wants in your limits" },
		{
			type: "p",
			text: "A limit is a **Need** or a **Want** when every category in it is that kind (set on the [Categories](/categories) page, sub-categories following their parent). The card says so, and when at least one limit has a kind, the summary at the top adds them up: what you spent on your need limits against what they allow, then the same for wants. A limit that mixes the two, or has unsorted categories, is counted under **Other limits**.",
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
