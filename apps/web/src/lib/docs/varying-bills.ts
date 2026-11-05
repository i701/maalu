import type { Doc } from "./types";

/** Bills that recur but never come to exactly the same amount. Keep this in step with the
 * "Available to spend" and subscription paragraphs in CLAUDE.md. */
export const varyingBills: Doc = {
	slug: "varying-bills",
	title: "Bills that change each month",
	summary:
		"A server, a phone or a utility bill that comes every month but is never exactly the same. Mark it as varying, and enter the real amount (and exchange rate) when you pay it.",
	symbol: "paid",
	accent: "amber",
	where: [
		{ to: "/subscriptions", label: "Subscriptions: mark a bill as varying" },
		{ to: "/plan", label: "Month plan: see your bills as estimates" },
		{ to: "/transactions", label: "Transactions: the upcoming list" },
	],
	blocks: [
		{
			type: "p",
			text: "Most recurring bills are the same every month, but some are not: a Digital Ocean or Linode server, an electricity bill, a data plan. You still want them planned, so your [Month plan](/plan) knows they are coming, but the amount is only a good guess until the bill arrives.",
		},

		{ type: "h2", id: "mark-it", text: "Mark the bill as varying" },
		{
			type: "steps",
			items: [
				"Open [Subscriptions](/subscriptions) and add the bill, or edit the one you have.",
				"Enter the **usual** amount. For a bill in dollars, choose the currency and the exchange rate you normally see.",
				"Switch on **The amount changes from month to month** and press **Save**.",
			],
		},
		{
			type: "p",
			text: "Maalu keeps planning the next payment as usual. The only difference is that it is shown as an **estimate**: the [Month plan](/plan) marks it with an Estimate label and a leading ≈, and the **Available to spend** figure on your [dashboard](/dashboard) lists it as an estimate.",
		},

		{ type: "h2", id: "when-it-comes", text: "When the real bill comes" },
		{
			type: "steps",
			items: [
				"On the [Month plan](/plan) press **Enter the real amount** next to the bill (or **Mark as paid** in the upcoming list on [Transactions](/transactions)).",
				"Type the amount you were actually charged.",
				"For a bill in another currency, also set what it really cost: either the **Exchange rate** it was paid at, or the exact amount taken from your account in the **Charged in** field (the rate is worked out from it).",
				"Check the date and press **Save**.",
			],
		},
		{
			type: "example",
			title: "Example: a dollar server bill",
			rows: [
				["Usual amount", "USD 10.00 at a rate of 15.4 (MVR 154.00)"],
				["The invoice says", "USD 12.00"],
				["Your bank took", "MVR 186.00"],
				["You enter", "Amount 12 and Charged in MVR 186"],
				["Maalu records", "USD 12.00 at a rate of 15.5, so MVR 186.00"],
			],
			note: "If you only know the rate, enter that instead and leave **Charged in** empty. If you change neither, the planned rate is kept.",
		},
		{
			type: "callout",
			tone: "note",
			text: "The next month's payment is planned at the **usual** amount again, not at what you just paid. Change the usual amount on the subscription if the bill has really gone up.",
		},

		{ type: "h2", id: "good-to-know", text: "Good to know" },
		{
			type: "list",
			items: [
				"Marking a bill as varying changes nothing about how it is paid or counted. It only labels the plan as an estimate.",
				"A bill in your base currency has no rate to set, so the rate fields only appear for bills in another currency.",
				"You can give the exchange rate or what it cost, not both.",
				"Any planned payment, not only a subscription's, can be paid for a different amount. The varying flag is just a reminder that it will be different.",
			],
		},
	],
};
