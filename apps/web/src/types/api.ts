/** What every server function returns: errors are values, so they survive serialisation. */
export type ApiResult<T> =
	| {
			ok: true;
			data: T;
			/** From the API's X-Total-Count header on paginated lists. */ total?: number;
	  }
	| { ok: false; status: number; error: string };

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
	income: "Income",
	expense: "Expense",
	transfer: "Transfer",
};

export const PAYMENT_METHODS = [
	"cash",
	"bank_transfer",
	"debit_card",
	"credit_card",
	"paypal",
	"other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
	cash: "Cash",
	bank_transfer: "Bank transfer",
	debit_card: "Debit card",
	credit_card: "Credit card",
	paypal: "PayPal",
	other: "Other",
};

export const VENDOR_LOCALITIES = ["local", "foreign", "unknown"] as const;
export type VendorLocality = (typeof VENDOR_LOCALITIES)[number];

export const VENDOR_LOCALITY_LABELS: Record<VendorLocality, string> = {
	local: "Local",
	foreign: "Foreign",
	unknown: "Not set",
};

export const INTERVAL_UNIT_LABELS = { week: "Weekly", month: "Monthly", year: "Yearly" } as const;

export const INTERVAL_UNITS = ["week", "month", "year"] as const;
export type IntervalUnit = (typeof INTERVAL_UNITS)[number];

export const SUBSCRIPTION_STATUSES = ["active", "paused", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
	active: "Active",
	paused: "Paused",
	cancelled: "Cancelled",
};

export const ACCOUNT_GROUPS = [
	"cash",
	"accounts",
	"card",
	"debit_card",
	"savings",
	"prepaid",
	"investments",
	"overdrafts",
	"loan",
	"insurance",
	"others",
] as const;
export type AccountGroup = (typeof ACCOUNT_GROUPS)[number];

export const ACCOUNT_GROUP_LABELS: Record<AccountGroup, string> = {
	cash: "Cash",
	accounts: "Accounts",
	card: "Card",
	debit_card: "Debit Card",
	savings: "Savings",
	prepaid: "Top-Up/Prepaid",
	investments: "Investments",
	overdrafts: "Overdrafts",
	loan: "Loan",
	insurance: "Insurance",
	others: "Others",
};

export type User = {
	id: string;
	email: string;
	base_currency: string;
	created_at: string;
};

export type Vendor = {
	id: string;
	name: string;
	address: string | null;
	is_local: boolean | null;
	currency: string | null;
	contact: string | null;
	created_at: string;
};

export type Subscription = {
	id: string;
	name: string;
	vendor: Vendor | null;
	/** Cost per billing cycle in `currency`; always positive. */
	amount: string;
	currency: string;
	exchange_rate: string;
	base_amount: string;
	payment_method: PaymentMethod;
	category: string;
	interval_unit: IntervalUnit;
	interval_count: number;
	start_date: string;
	status: SubscriptionStatus;
	// Computed by the API from the schedule and the linked transactions.
	last_paid_date: string | null;
	next_due_date: string | null;
	is_overdue: boolean;
	monthly_base_cost: string;
	created_at: string;
};

export type SubscriptionSummary = {
	active_count: number;
	monthly_base_total: string;
	currency: string;
};

export type Account = {
	id: string;
	group: AccountGroup;
	name: string;
	opening_amount: string;
	currency: string;
	exchange_rate: string;
	description: string | null;
	/** Card / Overdrafts / Loan: the balance is money you owe. */
	is_liability: boolean;
	/** Opening amount + linked transactions (computed by the API). */
	balance: string;
	/** Balance valued in your base currency. */
	base_balance: string;
	transaction_count: number;
	created_at: string;
};

export type AccountRef = { id: string; name: string; group: AccountGroup; currency: string };

export type AccountSummary = {
	assets: string;
	liabilities: string;
	total: string;
	currency: string;
};

// Money fields are decimal *strings* end to end; never parse them into floats for math.
/** One item of a split transaction. `amount` is the line total paid, tax included. */
export type TransactionSplit = {
	id: string;
	name: string;
	quantity: string;
	category: string;
	amount: string;
	tax_amount: string | null;
};

export type Transaction = {
	id: string;
	type: TransactionType;
	/** Always positive: `type` says which way the money moved. */
	amount: string;
	/** Transfers only: what arrived in the destination account (its currency). */
	to_amount: string | null;
	currency: string;
	exchange_rate: string;
	base_amount: string;
	payment_method: PaymentMethod;
	category: string;
	description: string | null;
	transaction_date: string;
	/** Optional breakdown by item and category; adds up to `amount`. `category` is the biggest line's. */
	splits: TransactionSplit[];
	vendor: Vendor | null;
	subscription: { id: string; name: string } | null;
	account: AccountRef | null;
	/** Transfers only: the destination account (`account` is the source). */
	to_account: AccountRef | null;
	created_at: string;
};

/** Income or expense in one category (base currency). A split transaction counts under each of its items' categories. */
export type CategoryTotal = {
	type: "income" | "expense";
	category: string;
	total: string;
	count: number;
};
export type CategoryTotals = { currency: string; categories: CategoryTotal[] };

/** Income and expense totals of the filtered transactions, in the user's base currency. */
export type TransactionTotals = { income: string; expense: string; currency: string };
