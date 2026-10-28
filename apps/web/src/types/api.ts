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
	category_id: string;
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
	/** When it was archived; null for an account in use. */
	archived_at: string | null;
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
/** A category. Transactions, split items and subscriptions point at one; names are unique per user ignoring case. */
export type Category = {
	id: string;
	name: string;
	created_at: string;
	/** Transactions in this category, or with an item in it */
	transaction_count: number;
	subscription_count: number;
	/** Budget lines that include this category */
	budget_line_count: number;
};

/** One item of a split transaction. `amount` is the line total paid, tax included. */
export type TransactionSplit = {
	id: string;
	name: string;
	quantity: string;
	category: string;
	category_id: string;
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
	/** Null for transfers, which have no category */
	category_id: string | null;
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
	/** When it was moved to the trash; null for a live transaction. */
	deleted_at: string | null;
};

/** Income or expense in one category (base currency). A split transaction counts under each of its items' categories. */
export type CategoryTotal = {
	type: "income" | "expense";
	category_id: string;
	category: string;
	total: string;
	count: number;
};
export type CategoryTotals = { currency: string; categories: CategoryTotal[] };

/** Income and expense totals of the filtered transactions, in the user's base currency. */
export type TransactionTotals = { income: string; expense: string; currency: string };

export type BudgetStatus = "ok" | "warning" | "over";

export type BudgetLine = {
	id: string;
	name: string;
	categories: { id: string; name: string }[];
	/** The limit for each period */
	amount: string;
	rollover: boolean;
	/** This line's own warning level, when it has one */
	warn_percent: number | null;
	/** Unspent money carried in from earlier periods */
	carried: string;
	/** Expenses in the line's categories this period, in the base currency */
	activity: string;
	/** amount + carried - activity (negative when over) */
	available: string;
	/** Share of (amount + carried) already spent, rounded down */
	percent: number;
	status: BudgetStatus;
};

export type Budget = {
	currency: string;
	/** Day of the month a period starts (1-28; 1 = calendar months) */
	period_start_day: number;
	/** Default level at which a line is flagged as close to its limit */
	warn_percent: number;
	/** `end` is inclusive */
	period: { start: string; end: string; is_current: boolean };
	lines: BudgetLine[];
	totals: {
		amount: string;
		activity: string;
		available: string;
		percent: number;
		status: BudgetStatus;
	};
	/** Lines that are close to their limit or over it */
	attention: number;
};

/** Money set aside for a goal (positive) or taken back out (negative), in the base currency. */
export type GoalEntry = { id: string; entry_date: string; amount: string; note: string | null };

export type Goal = {
	id: string;
	name: string;
	/** Your base currency: every amount on a goal is in it */
	currency: string;
	target_amount: string;
	target_date: string | null;
	/** What you plan to put aside each budget period */
	monthly_amount: string | null;
	/** "account" follows a savings account's balance; "manual" is a log of money set aside */
	mode: "account" | "manual";
	account: AccountRef | null;
	saved: string;
	/** Never below zero */
	remaining: string;
	percent: number;
	reached: boolean;
	/** Whole months to the target date, 0 once it has passed, null without a date */
	months_left: number | null;
	needed_per_month: string | null;
	/** For the budget period asked about, when a monthly plan is set */
	period_planned: string | null;
	period_contributed: string | null;
	period_status: "funded" | "pending" | null;
	/** Newest first; empty for an account-linked goal */
	entries: GoalEntry[];
};

/** Income and expense of one calendar month, in the base currency. */
export type MonthlyPoint = { month: string; income: string; expense: string };
export type MonthlyStats = { currency: string; months: MonthlyPoint[] };

/** What the accounts were worth at the end of a day, in the base currency. */
export type BalancePoint = { date: string; assets: string; liabilities: string; total: string };
export type BalanceTrend = { currency: string; points: BalancePoint[] };

/** A market exchange rate offered as a suggestion; the rate you save is the one you confirm. */
export type MarketRate = {
	base: string;
	quote: string;
	/** Units of `quote` per 1 unit of `base`, as a decimal string */
	rate: string;
	/** The day the rate is for; earlier than `requested_date` when that day had no data */
	rate_date: string;
	requested_date: string;
	exact: boolean;
	source: string;
};
