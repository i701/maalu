import type { Doc } from "./types";

/** Savings goals: following an account, or set aside by hand. Keep this in step with the goals
 * paragraph in CLAUDE.md. */
export const goals: Doc = {
	slug: "goals",
	title: "Savings goals",
	summary:
		"Save toward something, like a trip or an emergency fund, and see how far along you are and what each month needs.",
	symbol: "flag",
	accent: "green",
	where: [
		{ to: "/budget", label: "Budget: the Savings goals section" },
		{ to: "/plan", label: "Month plan: money set aside is not counted as spendable" },
		{ to: "/docs/salary-split", label: "Guide: send part of your salary to a goal" },
	],
	blocks: [
		{
			type: "p",
			text: "A goal is an amount you want to have by a date. Goals are at the bottom of the [Budget](/budget) page under **Savings goals**. They are always in your base currency.",
		},

		{ type: "h2", id: "two-kinds", text: "Two kinds of goal" },
		{
			type: "p",
			text: "When you add a goal, **Where is the money?** decides how its progress is measured:",
		},
		{
			type: "list",
			items: [
				"**An account**: the goal follows that account's balance. Use this when the money has a home of its own, like a savings account for your emergency fund. Each account can have one goal, and a card, overdraft or loan can't be chosen.",
				"**Inside my accounts: I'll set it aside by hand**: the money stays in your everyday accounts, and you record what you put toward the goal. Use this when you save in the same account you spend from.",
			],
		},

		{ type: "h2", id: "add-a-goal", text: "Add a goal" },
		{
			type: "steps",
			items: [
				"On [Budget](/budget), press **Add goal** under Savings goals.",
				"Give it a **Name** and a **Target**.",
				"Optionally set a **Target date**: the goal then works out how much is needed each month.",
				"Choose **Where is the money?**",
				"Optionally fill in **Plan to set aside each period**: the goal then shows whether this period's amount is done.",
				"Press **Save**.",
			],
		},
		{
			type: "p",
			text: "For a goal you set aside by hand, use **Add or take out** on its card to record money set aside (or taken back out). Each entry has a date and an optional note, and you can remove one if you made a mistake.",
		},

		{ type: "h2", id: "reading-it", text: "Reading a goal" },
		{
			type: "list",
			items: [
				"The bar shows what is saved against the target. The remaining amount never goes below zero, and the goal says **Goal reached** once you get there (the bell tells you too).",
				"With a target date, a line like **Needs MVR 2,250 a month for 4 more months** says what you have to put away from now on.",
				"With a monthly plan, the card says **This period: funded** or **This period: still to set aside**.",
			],
		},
		{
			type: "example",
			title: "Example: a trip fund",
			rows: [
				["Target", "MVR 15,000 by the end of March"],
				["Saved so far", "MVR 6,000"],
				["Months left", "4"],
				["Needed", "9,000 ÷ 4 = MVR 2,250 a month"],
			],
			note: "The monthly figure is rounded up, so following it always gets you there.",
		},
		{
			type: "callout",
			tone: "note",
			title: "What counts as setting aside, for an account goal",
			text: "The month's progress is the money you **moved into** the account less what you moved out. Interest and other income landing in the account raise its balance, and so the goal, but are not counted as what you set aside that month.",
		},

		{ type: "h2", id: "spending", text: "Goals and what you can spend" },
		{
			type: "p",
			text: "The **Available to spend** figure on the [dashboard](/dashboard) and the [Month plan](/plan) treats goal money as already spoken for: an account a goal follows is left out of what you can spend, and money set aside by hand is taken off your everyday balance. See [Month plan](/docs/month-plan).",
		},
		{
			type: "callout",
			tone: "tip",
			text: "To fill a goal automatically each payday, add it to your salary split. See [Split your salary](/docs/salary-split).",
		},
	],
};
