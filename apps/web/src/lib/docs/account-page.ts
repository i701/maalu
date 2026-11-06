import type { Doc } from "./types";

/** What is on an account's own page. Keep this in step with the "Account detail page" and
 * "balance adjustment" paragraphs in CLAUDE.md. */
export const accountPage: Doc = {
	slug: "account-page",
	title: "An account's page",
	summary:
		"Everything about one account in one place: its balance over time, its own transactions with the balance after each, and a way to make it match your bank.",
	symbol: "tune",
	accent: "blue",
	where: [{ to: "/accounts", label: "Accounts: open an account from its name" }],
	blocks: [
		{
			type: "p",
			text: "Press an account's name on the [Accounts](/accounts) page to open its page. It shows only that account: its balance, how the balance moved, and every transaction that touched it. For what the groups mean and how cards fit in, see [Accounts, cards and groups](/docs/accounts).",
		},

		{ type: "h2", id: "at-a-glance", text: "At a glance" },
		{
			type: "list",
			items: [
				"**Balance**, or **Owed** for a credit card, with its credit use if it has a limit.",
				"**In** and **Out** this month, in your base currency.",
				"A **Planned** box with the upcoming bills and income that touch the account, linking to the [month plan](/plan).",
				"The account's debit or credit cards, with **Repay** on a credit card.",
			],
		},
		{
			type: "p",
			text: "The buttons at the top are **Add transaction** (a new one starts in this account), **Edit account** and **Adjust balance**. An archived account has only **Edit account**.",
		},

		{ type: "h2", id: "chart", text: "Balance over time" },
		{
			type: "p",
			text: "The chart shows what the account held at the end of each day, in the account's own currency. Choose **30 days**, **90 days** or **1 year**. Under it you see where it started and ended and its lowest and highest points, and the table button lists the same figures by week.",
		},
		{
			type: "list",
			items: [
				"A day with nothing in it repeats the day before.",
				"Planned transactions are not in it until you mark them paid, and a transaction dated in the future is left out until its day.",
				"A transfer counts on both sides: out of one account and into the other.",
			],
		},

		{ type: "h2", id: "transactions", text: "Its transactions" },
		{
			type: "p",
			text: "Below the chart are the account's own transactions, with a search box, a date range and type chips. Each row shows its **effect on this account**, which is not always what the transaction was:",
		},
		{
			type: "list",
			items: [
				"A transfer out of the account is a minus, labelled **To** the other account. A transfer into it is a plus, labelled **From** the other account.",
				"A refund is money in.",
				"A balance **Adjustment** carries its own tag and can only be deleted, not edited.",
			],
		},
		{
			type: "p",
			text: "The **Balance** column is what the account held right after that transaction, so you can follow the balance down the list and check it against your bank. It is shown for the newest 500 transactions; older rows show a dash.",
		},

		{ type: "h2", id: "adjust", text: "Making the balance match your bank" },
		{
			type: "p",
			text: "If Maalu's balance and your bank's differ and you cannot find why, press **Adjust balance**. Either type **what the bank shows** and Maalu works out the difference, or add or take away a set amount. Pick a date, and add a note if you like.",
		},
		{
			type: "list",
			items: [
				"It records an **Adjustment** transaction: income if the balance was too low, an expense if too high.",
				"It moves the balance and the chart, but is **left out of every report**, budget and total, because it is a correction and not real income or spending.",
				"An earlier date changes the history from that day on.",
				"To undo it, delete the adjustment.",
			],
		},
		{
			type: "callout",
			tone: "tip",
			text: "Know what the difference is? Add the real transaction instead (a forgotten coffee, a fee). Use an adjustment only for what you cannot explain, so your reports stay honest.",
		},

		{
			type: "faq",
			items: [
				{
					q: "Why is the chart in a different currency from my dashboard?",
					a: "An account's page always uses the account's own currency. The dashboard and [net worth](/net-worth) show everything in your base currency.",
				},
				{
					q: "Why do old rows have no balance?",
					a: "Only the newest 500 transactions show a running balance. The chart still covers the whole range you choose.",
				},
				{
					q: "Why is a bill I planned not in the balance?",
					a: "A planned transaction counts toward nothing until you mark it paid. It is listed in the **Planned** box instead.",
				},
			],
		},
	],
};
