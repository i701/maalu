/** What every server function returns: errors are values, so they survive serialisation. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

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

export const INTERVAL_UNITS = ["week", "month", "year"] as const;
export type IntervalUnit = (typeof INTERVAL_UNITS)[number];

export const SUBSCRIPTION_STATUSES = ["active", "paused", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
	active: "Active",
	paused: "Paused",
	cancelled: "Cancelled",
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

// Money fields are decimal *strings* end to end; never parse them into floats for math.
export type Transaction = {
	id: string;
	amount: string;
	currency: string;
	exchange_rate: string;
	base_amount: string;
	payment_method: PaymentMethod;
	category: string;
	description: string | null;
	transaction_date: string;
	vendor: Vendor | null;
	subscription: { id: string; name: string } | null;
	created_at: string;
};
