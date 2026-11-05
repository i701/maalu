import type { Doc } from "./types";

/** Recurring charges: what they are, how they plan their payments and how to pay, skip or end
 * them. Keep this in step with the subscription paragraphs in CLAUDE.md. */
export const subscriptions: Doc = {
	slug: "subscriptions",
	title: "Subscriptions and recurring bills",
	summary:
		"Things you pay on a schedule: rent, internet, a server, a phone on instalments. Maalu plans the next payment for you, shows it coming, and you mark it paid when it is.",
	symbol: "event_repeat",
	accent: "violet",
	where: [
		{ to: "/subscriptions", label: "Subscriptions: add and manage them" },
		{ to: "/transactions", label: "Transactions: the upcoming list" },
		{ to: "/plan", label: "Month plan: bills by day" },
		{ to: "/docs/varying-bills", label: "Guide: bills that change each month" },
	],
	blocks: [
		{
			type: "p",
			text: "A subscription is anything you pay again and again: a monthly bill, a yearly renewal, a server, a phone you pay off over twelve months. You tell Maalu once how much, how often and from which account. From then on it keeps the **next payment** planned, so you can see what is coming, and it counts the payment only when you say it was made.",
		},

		{ type: "h2", id: "add-one", text: "Add a subscription" },
		{
			type: "steps",
			items: [
				"Open [Subscriptions](/subscriptions) and press **Add subscription**.",
				"Give it a **Name** and the **Cost per cycle**.",
				"Choose how often it is billed with **Every** and **Billing period** (for example every 1 month, or every 3 months).",
				"Set the **First billing date**. It anchors the schedule: a bill first due on the 28th stays on the 28th, shorter months aside.",
				"Pick the **Payment method** and a **Category**, and add a **Vendor** if you like.",
				"Optionally choose **Pay from**, the account it comes out of (see below), then press **Save**.",
			],
		},
		{
			type: "callout",
			tone: "tip",
			title: "Already paid it once?",
			text: "On any expense in your [transaction list](/transactions), the **Make subscription** button turns that payment into a subscription: you only say how often it repeats, and the rest is filled in from the transaction.",
		},

		{ type: "h2", id: "planning", text: "How the next payment is planned" },
		{
			type: "p",
			text: "An active subscription always has **one** planned payment: its next billing date, as long as that is within about five weeks. Planned payments count toward nothing yet, so your balances and reports stay true. You will find them in three places:",
		},
		{
			type: "list",
			items: [
				"The **Upcoming** list at the top of [Transactions](/transactions), where each one has a **Mark as paid** button.",
				"The [Month plan](/plan), which lays your bills out by day and shows what is left after each one.",
				"The **Available to spend** card on your [dashboard](/dashboard), which takes them off what you can spend.",
			],
		},

		{ type: "h2", id: "paying", text: "When you pay it" },
		{
			type: "steps",
			items: [
				"Press **Mark as paid** on the planned payment (in the Upcoming list, or on the Month plan).",
				"Check the **Amount**, and change it if the real bill differs. A bill is rarely exactly what was planned.",
				"Check the date and press **Save**.",
			],
		},
		{
			type: "p",
			text: "The payment becomes a real expense, moves the account's balance, and the **next** cycle is planned straight away. If you paid it some other way, for example by adding the expense yourself and linking it to the subscription, Maalu notices and removes the planned one so it is not counted twice.",
		},
		{
			type: "callout",
			tone: "note",
			title: "A late bill stays put",
			text: "Only one payment is planned at a time. A payment you haven't marked paid stays on the list as **overdue** in red, and the next one is planned only once you pay it or skip it.",
		},

		{ type: "h2", id: "skipping", text: "Skipping a payment" },
		{
			type: "p",
			text: "Some months you don't pay: a holiday, a waived fee. Press the delete button on the planned payment, which reads **Skip this payment** for a subscription. That cycle is skipped for good and will not come back, and the following cycle is planned instead. Nothing is lost from your history.",
		},

		{ type: "h2", id: "pay-from", text: "Paying from an account" },
		{
			type: "p",
			text: "If you choose **Pay from**, its planned payments go in that account, so paying one moves that account's balance. The subscription then takes the account's currency, and the **Currency** field is locked to it. Pick an [account](/accounts) that is in the currency the bill is in. Leave it empty if you pay from different places.",
		},

		{ type: "h2", id: "instalments", text: "Instalments: a fixed number of payments" },
		{
			type: "p",
			text: "For something you are paying off, such as a phone over 12 months, fill in **Number of payments**. The list then shows progress, for example “3 of 12 paid”. After the last payment the subscription becomes **Completed** by itself, nothing more is planned, and Maalu tells you the last payment was made. A payment you skip does not use up one of the payments: it still needs paying.",
		},

		{ type: "h2", id: "reminders", text: "Reminders" },
		{
			type: "p",
			text: "**Remind me** chooses how long before a payment's date you are told it is coming, from the day itself up to a month ahead, or never. The reminder shows in the bell at the top of the page. Overdue payments are always told, whatever you choose.",
		},

		{ type: "h2", id: "varying", text: "When the amount changes" },
		{
			type: "p",
			text: "A server or a utility bill rarely comes to the same amount twice. Switch on **The amount changes from month to month** and its planned payments are shown as estimates, and when you pay one you enter the real amount (and, for a bill in dollars, the real exchange rate). The full steps are in [Bills that change each month](/docs/varying-bills).",
		},

		{ type: "h2", id: "managing", text: "Pausing, ending and changing" },
		{
			type: "list",
			items: [
				"Set **Status** to **Paused** to stop the planned payments for a while, and back to **Active** to start again. **Cancelled** is for good. **Completed** happens by itself after an instalment plan's last payment.",
				"Changing the first billing date, how often it repeats, or pausing it clears the planned payment and plans a new one from the new schedule when it is active again.",
				"Other changes, such as the name or the account, carry over to the planned payment. An amount you already adjusted on a planned payment is kept.",
				"Deleting a subscription keeps every payment you already made: they stay in your transactions, just no longer linked to it.",
			],
		},
		{
			type: "p",
			text: "At the top of the [Subscriptions](/subscriptions) page you see the **Monthly total** of your active subscriptions in your base currency, with yearly and weekly ones worked out per month.",
		},

		{ type: "h2", id: "troubleshooting", text: "Questions and problems" },
		{
			type: "faq",
			items: [
				{
					q: "I paid a bill but it still shows as planned.",
					a: "Paying it outside Maalu doesn't change anything here. Press **Mark as paid** on the planned payment, or add the expense yourself and link it to the subscription so the planned one is removed.",
				},
				{
					q: "There is no planned payment for my subscription.",
					a: "It is planned only when it is **Active**, its next billing date is within about five weeks, and the one before it has been paid or skipped. A paused, cancelled or completed subscription plans nothing.",
				},
				{
					q: "The amount was different this month. Does the next one change?",
					a: "No. The next payment is planned at the usual amount again. Change the amount on the subscription itself if the bill has really gone up.",
				},
				{
					q: "Can I pay a subscription in another currency?",
					a: "Yes. Choose the currency and the exchange rate you normally see, or pick an account in that currency under **Pay from**. When you pay, you can enter the rate it really cost.",
				},
			],
		},
	],
};
