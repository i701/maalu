import type { Doc } from "./types";

/** Refunds, linking two entries into one transfer, and balance adjustments. Keep this in step with
 * the refunds, transfer link and balance adjustment paragraphs in CLAUDE.md. */
export const fixingRecords: Doc = {
	slug: "fixing-records",
	title: "Refunds, transfers and corrections",
	summary:
		"Record money you got back for a purchase, turn a move you entered twice into one transfer, and bring an account in line with what your bank shows.",
	symbol: "handyman",
	accent: "blue",
	where: [
		{ to: "/transactions", label: "Transactions: Refund, Link to a purchase, Possible transfers" },
		{ to: "/accounts", label: "Accounts: Adjust balance" },
		{ to: "/trash", label: "Trash: undo a change" },
		{ to: "/docs/import", label: "Guide: import a bank statement" },
	],
	blocks: [
		{
			type: "p",
			text: "Real records get messy: a shop refunds you, you enter both sides of a transfer by hand, or a balance drifts away from your bank's. Each of these has its own fix, so your totals stay true.",
		},

		{ type: "h2", id: "refunds", text: "Refunds" },
		{
			type: "p",
			text: "A refund is money back for something you bought. It is not income: it takes away from what you spent, in the same category, so your spending, budget and reports come out right.",
		},
		{
			type: "steps",
			items: [
				"On [Transactions](/transactions), find the purchase and press its **Refund** button.",
				"Enter the **Amount refunded**: all of it or part of it. The dialog says how much is left to refund.",
				"For a purchase split into items, tick the items you got back instead, with an amount for each.",
				"Choose where it was **Paid back into**, check the date and press **Save**.",
			],
		},
		{
			type: "list",
			items: [
				"A purchase can be refunded more than once, but never for more than it cost.",
				"The refund has the purchase's currency and category, and is shown with a green Refund tag. The purchase then says how much was refunded.",
				"While a purchase has refunds, its amount, currency, category and items can't change, and it can't be deleted until its refunds are.",
			],
		},
		{
			type: "p",
			text: "Already entered the money back as plain income? Press **Link to a purchase** on that income, search for the purchase and press **Link**. It keeps its own date, amount and account, and from then on counts as a refund. Only purchases in the same currency with enough left to refund are offered.",
		},

		{ type: "h2", id: "transfers", text: "One move entered twice" },
		{
			type: "p",
			text: "Moving money between your own accounts is a **transfer**: it is neither spending nor income. If you recorded it as an expense in one account and an income in the other, your totals count it twice.",
		},
		{
			type: "list",
			items: [
				"**Possible transfers**, above the list on [Transactions](/transactions), shows pairs that look like one move: the same amount and currency, in two different accounts, within two days. Press **Merge** to make a pair one transfer, or **Not a pair** to stop it being suggested.",
				"To merge a pair yourself (for example between two currencies), tick the expense and the income on Transactions, press **Make a transfer** in the bar, and confirm with **Make one transfer**.",
			],
		},
		{
			type: "p",
			text: "The expense becomes the transfer and the income goes to the [Trash](/trash). Balances don't change, and your income and spending each drop by the amount. To undo it, restore the income from the Trash and edit the transfer back into an expense.",
		},

		{ type: "h2", id: "adjust", text: "When a balance doesn't match your bank" },
		{
			type: "p",
			text: "If an account in Maalu shows a different balance from your bank and you can't find the missing transaction, record a **balance adjustment**.",
		},
		{
			type: "steps",
			items: [
				"Open [Accounts](/accounts) and press **Adjust balance** on the account (or on its own page).",
				"Choose **Set to balance** and type the **Balance at your bank**, or **Add or take away** and type the difference (positive adds money, negative takes it away).",
				"Pick the **Date** it applies from (use an earlier date if the difference goes back) and add a note if you like.",
				"Press **Adjust**.",
			],
		},
		{
			type: "callout",
			tone: "note",
			text: "An adjustment moves the balance but is never counted as income or spending in your totals, budget or reports. It can't be edited: delete it and make a new one. Deleting it undoes it.",
		},
		{
			type: "callout",
			tone: "tip",
			text: "If the difference comes from a whole statement you haven't entered, [import the statement](/docs/import) instead: it brings in the real transactions and checks the balance for you.",
		},
	],
};
