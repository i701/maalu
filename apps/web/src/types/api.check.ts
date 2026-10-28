/**
 * Compile-time guard against the web types drifting from the API. `api.generated.ts` is generated
 * from the API's OpenAPI schema (`just api-types`); each line below says "whatever the API sends
 * for X must be a valid hand-written X". If the API changes shape, regenerating the types makes
 * `tsc` fail here until `api.ts` is updated to match. Nothing in this file exists at runtime.
 */
import type { components } from "./api.generated";
import type {
	Account,
	AccountGroup,
	AccountRef,
	AccountSummary,
	BalanceTrend,
	BulkResult,
	Budget,
	BudgetLine,
	Category,
	CategoryTotals,
	Goal,
	GoalEntry,
	IntervalUnit,
	MarketRate,
	MonthlyStats,
	PaymentMethod,
	Subscription,
	SubscriptionStatus,
	Tag,
	TagRef,
	TransactionTemplate,
	SubscriptionSummary,
	Transaction,
	TransactionSplit,
	TransactionTotals,
	TransactionType,
	User,
	Vendor,
	VendorLocality,
} from "./api";

type Api = components["schemas"];

/** True when `FromApi` can be used wherever the app expects `Web`; a compile error otherwise. */
type Sends<Web, FromApi extends Web> = [Web, FromApi] extends [unknown, unknown] ? true : never;

export type ApiShapes = [
	Sends<TransactionType, Api["TransactionType"]>,
	Sends<PaymentMethod, Api["PaymentMethod"]>,
	Sends<VendorLocality, Api["VendorLocality"]>,
	Sends<IntervalUnit, Api["IntervalUnit"]>,
	Sends<SubscriptionStatus, Api["SubscriptionStatus"]>,
	Sends<AccountGroup, Api["AccountGroup"]>,
	Sends<User, Api["UserResponse"]>,
	Sends<Vendor, Api["VendorResponse"]>,
	Sends<Subscription, Api["SubscriptionResponse"]>,
	Sends<SubscriptionSummary, Api["SubscriptionSummary"]>,
	Sends<Account, Api["AccountResponse"]>,
	Sends<AccountRef, Api["AccountRef"]>,
	Sends<AccountSummary, Api["AccountSummary"]>,
	Sends<Category, Api["CategoryResponse"]>,
	Sends<TransactionSplit, Api["SplitResponse"]>,
	Sends<Transaction, Api["TransactionResponse"]>,
	Sends<CategoryTotals, Api["CategoryTotals"]>,
	Sends<TransactionTotals, Api["TransactionTotals"]>,
	Sends<BudgetLine, Api["BudgetLineResponse"]>,
	Sends<Budget, Api["BudgetResponse"]>,
	Sends<GoalEntry, Api["GoalEntryResponse"]>,
	Sends<Goal, Api["GoalResponse"]>,
	Sends<MonthlyStats, Api["MonthlyResponse"]>,
	Sends<BalanceTrend, Api["BalanceTrendResponse"]>,
	Sends<MarketRate, Api["MarketRateResponse"]>,
	Sends<TransactionTemplate, Api["TemplateResponse"]>,
	Sends<Tag, Api["TagResponse"]>,
	Sends<BulkResult, Api["BulkResult"]>,
	Sends<TagRef, Api["TagRef"]>,
];
