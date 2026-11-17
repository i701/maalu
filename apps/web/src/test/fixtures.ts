import { withDefaults } from "#/lib/utils";
import type { AccountRef, Category, CategoryTotal, Transaction, Vendor } from "#/types/api";

/** Shared, fully typed test fixtures: each returns a complete API object with plain defaults. */

export const accountRef = (id: string, over: Partial<AccountRef> = {}): AccountRef =>
	withDefaults<AccountRef>(
		{
			id,
			name: id,
			currency: "MVR",
			bank: null,
			account_number: null,
			exclude_from_stats: false,
			group: "accounts",
		},
		over,
	);

export const makeVendor = (name: string, over: Partial<Vendor> = {}): Vendor =>
	withDefaults<Vendor>(
		{
			id: `id-${name.toLowerCase()}`,
			name,
			address: null,
			contact: null,
			currency: null,
			is_local: null,
			default_category: null,
			default_tags: [],
			latitude: null,
			longitude: null,
			place: null,
			created_at: "2026-11-13T00:00:00Z",
		},
		over,
	);

export const makeTransaction = (over: Partial<Transaction> = {}): Transaction =>
	withDefaults<Transaction>(
		{
			id: "t1",
			type: "expense",
			amount: "10.0000",
			currency: "MVR",
			exchange_rate: "1.00000000",
			base_amount: "10.0000",
			transaction_date: "2026-11-13",
			transaction_time: null,
			account: accountRef("bml"),
			to_account: null,
			to_amount: null,
			payment_method: "cash",
			category: "Food",
			category_id: null,
			category_color: null,
			category_is_salary: false,
			description: null,
			vendor: null,
			subscription: null,
			card: null,
			group: null,
			tags: [],
			splits: [],
			planned: false,
			adjustment: false,
			refund_of: null,
			refunded_amount: "0.0000",
			attachment_count: 0,
			link_count: 0,
			latitude: null,
			longitude: null,
			place: null,
			created_at: "2026-11-13T00:00:00Z",
			deleted_at: null,
		},
		over,
	);

export const categoryTotal = (over: Partial<CategoryTotal> = {}): CategoryTotal => {
	const category = over.category ?? "Food";
	return withDefaults<CategoryTotal>(
		{
			type: "expense",
			category,
			category_id: `id-${category.toLowerCase()}`,
			color: "slate",
			count: 1,
			kind: null,
			parent: null,
			parent_color: null,
			parent_id: null,
			total: "0",
		},
		over,
	);
};

export const makeCategory = (over: Partial<Category> = {}): Category => {
	const name = over.name ?? "Food";
	return withDefaults<Category>(
		{
			id: `id-${name.toLowerCase()}`,
			name,
			color: "slate",
			kind: null,
			effective_kind: null,
			parent: null,
			parent_id: null,
			is_salary: false,
			child_count: 0,
			budget_line_count: 0,
			subscription_count: 0,
			transaction_count: 0,
			created_at: "2026-11-13T00:00:00Z",
		},
		over,
	);
};
