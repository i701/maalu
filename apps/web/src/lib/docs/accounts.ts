import type { Doc } from "./types";

/** What an account is, what each group means, and how cards fit in. Keep this in step with the
 * account paragraphs in CLAUDE.md and `GROUP_HELP` in `lib/accounts.ts`. */
export const accounts: Doc = {
	slug: "accounts",
	title: "Accounts, cards and groups",
	summary:
		"What an account is, what each group means, and where a debit card fits: it spends from its bank account, so it is not an account of its own.",
	symbol: "account_balance",
	accent: "green",
	where: [
		{ to: "/accounts", label: "Accounts: add and edit them" },
		{ to: "/transactions", label: "Transactions: choose the account and how you paid" },
		{ to: "/net-worth", label: "Net worth: what your accounts add up to" },
	],
	blocks: [
		{
			type: "p",
			text: "An **account** is a place that holds a balance: your wallet, a bank account, a savings account, a loan you owe. Every transaction happens in an account, and each balance follows the transactions you link to it. Add yours on the [Accounts](/accounts) page.",
		},

		{ type: "h2", id: "cards", text: "Cards are not accounts" },
		{
			type: "p",
			text: "A bank gives you an account, and then a **debit card** for it. The card has no money of its own: when you pay with it, the money comes out of the account. So a debit card is not an account. It belongs to one, and you add it on that account's page.",
		},
		{
			type: "steps",
			items: [
				"Add the bank account once, in the **Bank accounts** group (for example MIB Current).",
				"Open the account from [Accounts](/accounts) and press **Add debit card**. Give it a name and, if you like, its last four digits.",
				"When you add a transaction in [Transactions](/transactions), pick the **Card**. Maalu fills in the account and sets the payment method to **Debit card** for you.",
			],
		},
		{
			type: "p",
			text: "Cards are how you tell your cards apart: each transaction shows which card paid, and the Transactions filter can show only one card's spending. Only the last four digits are ever stored, never the whole number.",
		},

		{ type: "h2", id: "credit-cards", text: "Credit cards" },
		{
			type: "p",
			text: "A **credit card** is different: you spend the bank's money and pay it back later. So it is an account of its own, in **Credit cards**, whose balance is what you owe (you can give it a credit limit). Your bank also links it to one of your bank accounts to repay it from.",
		},
		{
			type: "steps",
			items: [
				"Add the credit card as an account in the **Credit cards** group.",
				"On its page press **Add credit card**, and choose the bank account it is **Repaid from**.",
				"Spend with it by picking the card on a transaction: the spending goes on the card, not on your bank account yet.",
				"When you pay it off, press **Repay** on the card. That opens a transfer from the bank account into the card, ready for the amount.",
			],
		},
		{
			type: "callout",
			tone: "note",
			text: "Repaying is a **transfer**, not an expense, so nothing is counted twice: the spending was counted when you made it, and the repayment only moves money from your bank account to clear the debt.",
		},

		{ type: "h2", id: "statements", text: "Statements and due dates" },
		{
			type: "demo",
			id: "card-statement",
			title: "a credit card's Statement panel",
			caption:
				"This is the real panel from a card's page, filled in with made-up numbers. On your own card it shows your last statement and the Repay button works.",
		},
		{
			type: "p",
			text: "A credit card is billed once a month. Give the card the **day its statement closes** and the **day the payment is due** (in its **Edit** form, both or neither) and Maalu keeps track for you. Nothing is stored about a statement: it is worked out from your transactions.",
		},
		{
			type: "list",
			items: [
				"**On the statement** is what you owed on the day it closed. What you spent since then goes on the next statement.",
				"**Paid since** is money put on the card after it closed: a repayment, a refund, any income. It comes off what is on the statement.",
				"**Still to pay** is the rest, with its due date. The card's page shows it in a panel with a **Repay** button that opens the transfer already filled with that amount, and the [Accounts](/accounts) list shows one line under each card.",
				"A day past the end of a short month counts as the last day of that month, so a statement on the 31st closes on the 28th in February.",
			],
		},
		{
			type: "p",
			text: "Maalu also tells you with a notification three days before a payment is due, again if it is late, and when a card is over 90% of its credit limit (once a month). The [Month plan](/plan) counts a statement that falls due before the period ends as a bill, so the money for it is not shown as available.",
		},
		{
			type: "callout",
			tone: "tip",
			text: "Leave the days empty for a card you do not track this way. Everything else about the card works as before.",
		},

		{ type: "h2", id: "groups", text: "The groups" },
		{
			type: "list",
			items: [
				"**Cash**: notes and coins you hold, such as a wallet.",
				"**Bank accounts**: a current account you keep money in and pay from. Its debit card spends from it.",
				"**Savings**: a savings account, or money you keep apart on purpose. A goal can follow its balance.",
				"**Credit cards**: what you owe on a credit card, with an optional credit limit.",
				"**Top-Up/Prepaid**: a balance you spend down, such as phone credit or a transport card.",
				"**Investments**: money invested in shares, funds or a business.",
				"**Overdrafts**: money you owe the bank on an overdraft, up to a limit.",
				"**Loan**: money you owe and pay back in instalments.",
				"**Insurance** and **Others**: anything with a balance that does not fit the rest.",
			],
		},
		{
			type: "p",
			text: "The group decides a few things: whether the balance is money you have or money you owe, whether it counts as everyday money in your [dashboard's](/dashboard) available-to-spend figure (cash, bank accounts and prepaid do, and you can change that for one account with **I spend from this account** on its form), and which payment method is suggested when you pick the account.",
		},

		{ type: "h2", id: "example", text: "A typical setup" },
		{
			type: "example",
			title: "Example: one person with two banks",
			rows: [
				["Cash", "Wallet (Cash)"],
				["BML Current", "Bank accounts, with its debit card added on the account"],
				["BML Savings", "Savings"],
				["MIB Current", "Bank accounts"],
				["MIB Savings", "Savings, which an Emergency fund goal follows"],
			],
			note: "An emergency fund is a goal, not an account. Point a goal at a savings account and its progress is that account's balance.",
		},

		{ type: "h2", id: "good-to-know", text: "Good to know" },
		{
			type: "list",
			items: [
				"Give accounts a bank and a number on the [Accounts](/accounts) page if you have several at one bank, so they are easy to tell apart.",
				"On [Accounts](/accounts) the chips above the list filter it to one bank, **By bank** groups the cards under their banks, and the **Bank accounts** section lists each bank's accounts under the bank's name.",
				"Each account has its own page with a balance chart and a running balance: see [An account's page](/docs/account-page).",
				"Money moved between two of your own accounts is a **transfer**, not income or spending.",
				"An account you stop using can be **archived**: it leaves your lists but its history stays.",
				"Older **Debit Card** accounts were moved into **Bank accounts**, so nothing is lost.",
			],
		},
	],
};
