import type { Doc } from "./types";

/** What a category is, how to keep them tidy and how they feed the reports. Keep this in step with
 * the category paragraphs in CLAUDE.md (colours and parents, the Salary category, needs and wants). */
export const categories: Doc = {
	slug: "categories",
	title: "Categories",
	summary:
		"What your money is for: how categories are made, how to tidy them with sub-categories and merging, and how they feed the budget and the reports.",
	symbol: "category",
	accent: "pink",
	where: [
		{ to: "/categories", label: "Categories: rename, merge, sort into needs and wants" },
		{ to: "/transactions", label: "Transactions: a category is chosen on each one" },
		{ to: "/budget", label: "Budget: a limit covers one or more categories" },
		{ to: "/docs/reports", label: "Guide: needs and wants in the reports" },
	],
	blocks: [
		{
			type: "p",
			text: "A **category** says what a transaction was for: Groceries, Rent, Fuel. Every expense and every income has one, and the budget, the dashboard and the reports all add things up by category. You do not have to set them up first: type a new name on a [transaction](/transactions) and the category is made for you.",
		},

		{ type: "h2", id: "tidy", text: "Keeping them tidy" },
		{
			type: "list",
			items: [
				"Names are unique ignoring case, so **groceries** and **Groceries** are the same category.",
				"Press **Edit** on a row of the [Categories](/categories) page to rename it. Every transaction in it is renamed with it.",
				"A category that is in use cannot be deleted, so nothing is left without one. Press **Merge into another category** instead: its transactions, split items and subscriptions move to the one you choose, and then it is removed.",
				"A category that nothing uses can be deleted with **Delete**.",
			],
		},
		{
			type: "callout",
			tone: "tip",
			text: "Typed two spellings by accident, like Fuel and Petrol? Merge one into the other. Totals and the budget then count them together.",
		},

		{ type: "h2", id: "sub-categories", text: "Sub-categories" },
		{
			type: "p",
			text: "A category can sit under a **Parent category**, one level deep: Food can have Groceries and Eating out under it. A parent **includes its children**: filtering transactions by Food, the category totals and a budget limit on Food all count the whole family. A category that has sub-categories stays at the top. The parent can still be used on a transaction directly.",
		},
		{
			type: "p",
			text: "Deleting a parent leaves its sub-categories in place as top-level ones, and merging a parent moves its sub-categories with it.",
		},

		{ type: "h2", id: "colours", text: "Colours" },
		{
			type: "p",
			text: "Each category has a colour, shown as a dot beside its name in lists and charts. A new category gets the colour used least so far. Choose one in the form to override it.",
		},

		{ type: "h2", id: "need-or-want", text: "Needs and wants" },
		{
			type: "p",
			text: "The **Need or want** field marks what the spending is: rent and groceries are needs, eating out and games are wants. Leave it on **Not sorted** if you would rather not decide. A sub-category with no kind of its own takes its parent's, so you can mark Food a need and Eating out under it a want.",
		},
		{
			type: "steps",
			items: [
				"Press **Needs and wants** at the top of the page (it says how many categories are not sorted yet).",
				"Choose Need or Want for each category, or leave it as Not set.",
				"Press **Save**. Only the ones you changed are saved.",
			],
		},
		{
			type: "p",
			text: "The kinds feed the dashboard's **Needs and wants** card and its 50/30/20 check, the Needs and wants part of [Compare](/compare) and [Trends](/trends), the **Need** and **Want** chips on budget limits, and the kind filter on [Transactions](/transactions). See [Reports](/docs/reports) for how they read.",
		},
		{
			type: "callout",
			tone: "note",
			text: "A single purchase cannot differ from its category's kind. If one does, give it a sub-category (Food is a need, Food › Treats is a want). That keeps every figure reading from one place.",
		},

		{ type: "h2", id: "salary", text: "The Salary category" },
		{
			type: "p",
			text: "Every account has one built-in category, **Salary**, marked **Default · pay**. Only income goes in it, it cannot be renamed, merged away or deleted, and a salary in it is what Maalu offers to split between your accounts and goals (see [Split your salary](/docs/salary-split)). It never counts toward your needs and wants.",
		},

		{
			type: "faq",
			items: [
				{
					q: "Why can't I delete a category?",
					a: "Something still uses it: a transaction, a split item or a subscription. Merge it into another category instead, and everything moves across.",
				},
				{
					q: "Do categories change what a transaction cost?",
					a: "No. They only decide where it is counted. Changing a transaction's category moves its amount from one row of the reports to another.",
				},
				{
					q: "What about a purchase made of several things?",
					a: "Turn on **Split by item and category** in the transaction form and give each item its own category. The reports share the amount between the items' categories exactly.",
				},
			],
		},
	],
};
