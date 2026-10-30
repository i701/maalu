/**
 * Short names for the API's types. The shapes are generated from the API's OpenAPI schema into
 * `api.generated.ts` (`just api-types`), so they are never written by hand: change a Pydantic
 * schema, regenerate, and every use here follows. Only the display labels below are the web's own.
 * Money fields are decimal *strings* end to end; never parse them into floats for math.
 */
import {
	accountGroupValues,
	intervalUnitValues,
	paymentMethodValues,
	subscriptionStatusValues,
	transactionTypeValues,
	vendorLocalityValues,
	type components,
} from "./api.generated";

type Schemas = components["schemas"];

/** What every server function returns: errors are values, so they survive serialisation. */
export type ApiResult<T> =
	| {
			ok: true;
			data: T;
			/** From the API's X-Total-Count header on paginated lists. */ total?: number;
	  }
	| { ok: false; status: number; error: string };

// Enums: the values come from the API, in its order; the labels are the web's.

export type TransactionType = Schemas["TransactionType"];
export const TRANSACTION_TYPES = transactionTypeValues;
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
	income: "Income",
	expense: "Expense",
	transfer: "Transfer",
};

export type PaymentMethod = Schemas["PaymentMethod"];
export const PAYMENT_METHODS = paymentMethodValues;
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
	cash: "Cash",
	bank_transfer: "Bank transfer",
	debit_card: "Debit card",
	credit_card: "Credit card",
	other: "Other",
};

export type VendorLocality = Schemas["VendorLocality"];
export const VENDOR_LOCALITIES = vendorLocalityValues;
export const VENDOR_LOCALITY_LABELS: Record<VendorLocality, string> = {
	local: "Local",
	foreign: "Foreign",
	unknown: "Not set",
};

export type IntervalUnit = Schemas["IntervalUnit"];
export const INTERVAL_UNITS = intervalUnitValues;
export const INTERVAL_UNIT_LABELS: Record<IntervalUnit, string> = {
	week: "Weekly",
	month: "Monthly",
	year: "Yearly",
};

export type SubscriptionStatus = Schemas["SubscriptionStatus"];
export const SUBSCRIPTION_STATUSES = subscriptionStatusValues;
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
	active: "Active",
	paused: "Paused",
	cancelled: "Cancelled",
};

export type AccountGroup = Schemas["AccountGroup"];
export const ACCOUNT_GROUPS = accountGroupValues;
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

// Responses.

export type User = Schemas["UserResponse"];
export type RegistrationStatus = Schemas["RegistrationStatus"];
export type LoginResult = Schemas["Token"];
export type TwoFactorSetup = Schemas["TwoFactorSetup"];
export type RecoveryCodes = Schemas["RecoveryCodes"];
export type Vendor = Schemas["VendorResponse"];
export type Subscription = Schemas["SubscriptionResponse"];
export type SubscriptionSummary = Schemas["SubscriptionSummary"];
export type Account = Schemas["AccountResponse"];
export type AccountRef = Schemas["AccountRef"];
export type AccountSummary = Schemas["AccountSummary"];
export type Category = Schemas["CategoryResponse"];
export type TransactionSplit = Schemas["SplitResponse"];
export type Transaction = Schemas["TransactionResponse"];
export type BulkResult = Schemas["BulkResult"];
export type TagRef = Schemas["TagRef"];
export type Tag = Schemas["TagResponse"];
export type TransactionTemplate = Schemas["TemplateResponse"];
export type CategoryTotal = Schemas["CategoryTotal"];
export type CategoryTotals = Schemas["CategoryTotals"];
export type TransactionTotals = Schemas["TransactionTotals"];
export type BudgetStatus = Schemas["BudgetLineResponse"]["status"];
export type BudgetLine = Schemas["BudgetLineResponse"];
export type Budget = Schemas["BudgetResponse"];
export type GoalEntry = Schemas["GoalEntryResponse"];
export type Goal = Schemas["GoalResponse"];
export type MonthlyPoint = Schemas["MonthlyPoint"];
export type MonthlyStats = Schemas["MonthlyResponse"];
export type BalancePoint = Schemas["BalancePoint"];
export type BalanceTrend = Schemas["BalanceTrendResponse"];
export type MarketRate = Schemas["MarketRateResponse"];
