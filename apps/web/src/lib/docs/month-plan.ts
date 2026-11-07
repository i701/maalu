import type { Doc } from "./types";

/** Available to spend and the Month plan page. Keep this in step with the "Available to spend"
 * paragraph in CLAUDE.md. */
export const monthPlan: Doc = {
	slug: "month-plan",
	title: "Month plan and available to spend",
	summary:
		"What you can still spend until the end of the budget period, once the bills still to come and the money set aside for goals are taken off, and the day the money would run out.",
	symbol: "checklist",
	accent: "amber",
	where: [
		{ to: "/plan", label: "Month plan: bills by day" },
		{ to: "/dashboard", label: "Dashboard: the Available to spend card" },
		{ to: "/subscriptions", label: "Subscriptions: bills that plan themselves" },
		{ to: "/docs/goals", label: "Guide: savings goals" },
	],
	blocks: [
		{
			type: "p",
			text: "**Available to spend** answers one question: how much can I spend between now and the end of this budget period without missing a bill or touching money I have set aside? It is the card at the top of the [dashboard](/dashboard), and the [Month plan](/plan) lays the same figure out day by day.",
		},

		{ type: "h2", id: "the-sum", text: "How it is worked out" },
		{
			type: "example",
			title: "The sum",
			rows: [
				["You have", "What your everyday accounts hold now"],
				["less Bills to pay", "Planned expenses due before the period ends, overdue ones included"],
				["less Card statements", "Credit card statements that fall due before the period ends"],
				["less Set aside", "Money put toward goals by hand"],
				["equals", "Available to spend"],
			],
			note: "Press **Show the working** on the dashboard card to see each account, bill and goal behind the figure.",
		},
		{
			type: "list",
			items: [
				"**Everyday accounts** are cash, bank accounts and prepaid ones, unless you choose otherwise: the switch **I spend from this account** on an account's **Edit** form lets you count a savings account you spend from, or keep a cash account apart. Savings, investments and any account a goal follows are listed as **Kept apart**: their money is already meant for something. Credit cards, overdrafts and loans are not counted at all, because what you owe is not money to spend.",
				"**Bills to pay** are planned expenses from an everyday account (or no account yet) dated up to the end of the period. A subscription's next payment is one of them. A bill planned on a credit card is not counted, since it will not come out of your everyday money now.",
				"**Card statements** are what is still to pay on a credit card's last statement, when its due date is before the period ends (see [Accounts, cards and groups](/docs/accounts)). Spending on the card since the statement closed is not due yet, so it is not counted. Pay the statement and it drops out of the plan. Press **Open the card** on its row to repay it.",
				"**Expected income**, like next month's salary, is shown but never counted. The figure only uses money you already have.",
				"An account left out of totals in its settings, and archived accounts, are not counted.",
			],
		},
		{
			type: "callout",
			tone: "note",
			text: "The figure can go below zero. The card then says **Short** and the plan says **Short by**: the bills and money set aside add up to more than you hold.",
		},

		{ type: "h2", id: "the-plan", text: "The Month plan page" },
		{
			type: "p",
			text: "Open it from the sidebar or with **Open the month plan** on the dashboard card. Four tiles at the top repeat the sum. Below them, **Bills by day** lists every bill and expected income in date order, overdue ones first, each with what would be left after paying it.",
		},
		{
			type: "list",
			items: [
				"If everything is covered, the page says so. If not, it says where the money runs out, for example **The money runs out at Wifi Bill (Thu 6 Nov)**, and the first bill that would not be covered is marked **Short from here**.",
				"Planned income appears on its day as **Expected · not counted**. It does not change the running figure.",
				"A bill whose amount varies is shown as an **Estimate** with a leading ≈. See [Bills that change each month](/docs/varying-bills).",
				"The side column lists the accounts it counts, the money set aside for goals, and the accounts kept apart.",
			],
		},

		{ type: "h2", id: "paying", text: "Paying a bill or receiving pay" },
		{
			type: "steps",
			items: [
				"Press **Mark as paid** beside a bill (or **Enter the real amount** for a varying one).",
				"Check the date and the amount, change them if the real bill was different, and press **Save**.",
				"The bill becomes a real transaction, its money leaves the account, and the figures update.",
			],
		},
		{
			type: "p",
			text: "Planned income has **Received** instead. A salary is never exactly what was planned, so the dialog asks for the amount that really arrived. If you have a salary split, Maalu then offers to split it (see [Split your salary](/docs/salary-split)).",
		},

		{ type: "h2", id: "good-to-know", text: "Good to know" },
		{
			type: "list",
			items: [
				"It is always for the current budget period, which follows the start day set on the [Budget](/budget) page.",
				"To skip a bill this time, delete the planned payment on [Transactions](/transactions). A subscription then plans the one after it.",
				"Money set aside by hand is assumed to sit in your everyday accounts, so it is taken off them. A goal that follows an account needs no subtraction: that account is already left out.",
			],
		},
	],
};
