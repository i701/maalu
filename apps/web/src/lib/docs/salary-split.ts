import type { Doc } from "./types";

/** How to split a salary between accounts and goals. Keep this in step with the feature: see the
 * "Salary split" paragraph in CLAUDE.md. */
export const salarySplit: Doc = {
	slug: "salary-split",
	title: "Split your salary",
	summary:
		"When your salary arrives, Maalu can propose how to divide it: part moves to your savings, part is set aside for a goal. You confirm every line, and you can undo it.",
	symbol: "paid",
	accent: "green",
	where: [
		{ to: "/settings", label: "Settings: set up your rules" },
		{ to: "/transactions", label: "Transactions: add or split a salary" },
		{ to: "/plan", label: "Month plan: see what is left to spend" },
	],
	blocks: [
		{
			type: "p",
			text: "Most people do the same thing every pay day: move some money to savings, put some toward a trip, and live on the rest. The salary split does the sum for you. You say once what each account or goal should get, and every time a salary arrives Maalu shows you the split, ready to confirm.",
		},
		{
			type: "callout",
			tone: "note",
			title: "Nothing moves by itself",
			text: "Maalu only proposes the split. Money is moved and amounts are set aside only after you press **Make the split**.",
		},

		{ type: "h2", id: "what-you-need", text: "What you need" },
		{
			type: "list",
			items: [
				"An [account](/accounts) the salary arrives in, for example your current account.",
				"At least one place to send money: another [account](/accounts) (such as a savings account) or a savings goal (you make goals on the [Budget](/budget) page).",
				"Your salary entered as an income in the **Salary** category (you can see it on the [Categories](/categories) page). Every account has this category already, so you only have to pick it.",
			],
		},

		{ type: "h2", id: "set-up-rules", text: "Set up your rules" },
		{
			type: "p",
			text: "A rule says how much of each salary goes to one account or one goal. You set them once, and they stay until you change them.",
		},
		{
			type: "steps",
			items: [
				"Open [Settings](/settings) and find **When my salary arrives**.",
				"Press **Add rule**.",
				"Choose **An account** or **A goal**, then pick which one.",
				"Choose **A share of the salary** (a percentage, such as 20) or **A fixed amount** (for example 1,500).",
				"Enter the value and press **Save**. The card lists your rules and adds them up: for example “20% of the salary + MVR 1,500.00. The rest stays where the salary arrives.”",
			],
		},
		{
			type: "list",
			items: [
				"Each account or goal can have **one** rule. To change it, edit the rule instead of adding another.",
				"A share is a percentage of the **whole** salary, up to 100. A fixed amount is in the salary's currency.",
				"Deleting a rule stops it applying to future salaries. Splits you already made are not changed.",
			],
		},

		{ type: "h2", id: "when-salary-arrives", text: "When your salary arrives" },
		{
			type: "steps",
			items: [
				"Go to [Transactions](/transactions) and press **Add transaction**.",
				"Choose **Income**, enter the amount you received, pick the account it arrived in, and choose the category **Salary**. Leave **Planned** off: the salary has to have arrived (see the tip below if you planned it ahead).",
				"Press **Save**. The **Split this salary** window opens by itself, with every rule worked out.",
				"Look over the lines. Untick any you don't want this time, or type a different amount. Under the lines Maalu shows how much is moving and how much stays in the account.",
				"Press **Make the split**.",
			],
		},
		{
			type: "callout",
			tone: "tip",
			title: "Planned your salary ahead?",
			text: "You can enter the salary in advance with **Planned** switched on: it shows on the [Month plan](/plan) as expected income, and it is not counted until it arrives. When it does, press **Received** (on the [Month plan](/plan), or **Mark as paid** in the upcoming list on [Transactions](/transactions)), type the amount you **actually** got, then press **Split salary** on it. The split is worked out from that real amount.",
		},
		{
			type: "callout",
			tone: "tip",
			title: "Missed it, or want to do it later?",
			text: "Every salary in your [transaction list](/transactions) has a **Split salary** button (a small fork icon). It opens the same window whenever you like.",
		},

		{
			type: "example",
			title: "Example: a 10,000 salary",
			rows: [
				["Salary arrives in", "Main account: MVR 10,000.00"],
				["Rule: Savings account", "20% of the salary, so MVR 2,000.00"],
				["Rule: Thailand trip goal", "A fixed MVR 1,500.00"],
				["Moving", "MVR 3,500.00"],
				["Stays in Main", "MVR 6,500.00"],
			],
			note: "Your real salary will differ from this, and that is fine: percentages are worked out from the amount you enter. You can also change any line before you confirm, for example to put 2,500 into savings this month.",
		},

		{ type: "h2", id: "what-it-does", text: "What the split actually does" },
		{
			type: "list",
			items: [
				"**An account** gets a transfer from the account the salary arrived in. It appears in your transactions as a transfer dated the same day as the salary, described “From salary: name”.",
				"**A goal that follows a savings account** is treated the same way: the money is transferred into that account, so the goal's progress goes up.",
				"**A goal you track by hand** gets an amount set aside. No money moves between accounts, because the goal is a note of what you are keeping back. It stays in your account, and the **Available to spend** figure on your [dashboard](/dashboard) and the [Month plan](/plan) treats it as not yours to spend.",
			],
		},
		{
			type: "callout",
			tone: "note",
			text: "Transfers between your own accounts are not income or spending, so splitting a salary never changes your income and expense totals.",
		},

		{ type: "h2", id: "undo", text: "Undoing a split" },
		{
			type: "steps",
			items: [
				"Press **Split salary** on the salary again. The window now says **This salary was split** and lists what was made.",
				"Press **Undo the split**.",
			],
		},
		{
			type: "p",
			text: "The transfers go to the [Trash](/trash) and the amounts set aside for goals are removed, so your balances go back to how they were. After an undo you can split the same salary again.",
		},

		{ type: "h2", id: "good-to-know", text: "Good to know" },
		{
			type: "list",
			items: [
				"A salary can be split **once**. To change a split, undo it and make it again.",
				"The lines can't add up to more than the salary. Maalu stops you and says so.",
				"Only a salary that has **arrived** (not planned) and is **in an account** can be split.",
				"Both sides must be in the same currency. A line for an account in another currency is greyed out with the reason, and a goal can only be set aside from a salary in your base currency.",
				"The account the salary arrived in can't be a target, since the money is already there.",
				"Changing or deleting the salary later does not change what the split made. Undo the split first if you want them to match.",
				"Salary is the only income that can be split. Income in other categories, such as a bonus or a refund, cannot.",
			],
		},

		{ type: "h2", id: "troubleshooting", text: "Questions and problems" },
		{
			type: "faq",
			items: [
				{
					q: "The split window didn't open when I saved my salary.",
					a: "It opens by itself only when you have at least one rule, and the salary is in the **Salary** category and not marked **Planned**. Set up a rule in [Settings](/settings), then use the **Split salary** button on the salary.",
				},
				{
					q: "A line is greyed out and I can't tick it.",
					a: "Read the small red text under it: it says why. The usual reasons are that the target is the account the salary arrived in, is archived, or is in a different currency.",
				},
				{
					q: "I made a mistake. Can I fix it?",
					a: "Yes. Press **Split salary** on the salary, then **Undo the split**, and make it again with the right amounts.",
				},
				{
					q: "I want a category, not an account, to get part of my salary.",
					a: "Not yet. Budget limits are limits, not envelopes of money, so there is nothing to move into a category. Send the money to an account or a goal instead.",
				},
				{
					q: "Will my salary be split automatically each month?",
					a: "No. Maalu proposes the split and waits for you to confirm it, so you stay in control of where your money goes.",
				},
			],
		},
	],
};
