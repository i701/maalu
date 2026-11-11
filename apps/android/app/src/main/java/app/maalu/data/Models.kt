package app.maalu.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Hand-written for the few endpoints used so far; money stays a String on the wire.
// Later these come from apps/web/openapi.json (see the native apps guide, section 14).

@Serializable
data class Token(
    @SerialName("access_token") val accessToken: String? = null,
    @SerialName("challenge_token") val challengeToken: String? = null,
    @SerialName("two_factor_required") val twoFactorRequired: Boolean = false,
)

@Serializable
data class TwoFactorChallenge(
    @SerialName("challenge_token") val challengeToken: String,
    val code: String,
)

@Serializable
data class Account(
    val id: String,
    val name: String,
    val group: String,
    val currency: String,
    val balance: String,
    @SerialName("base_balance") val baseBalance: String,
    val bank: String? = null,
    @SerialName("account_number") val accountNumber: String? = null,
    @SerialName("is_liability") val isLiability: Boolean = false,
    @SerialName("exchange_rate") val exchangeRate: String = "1",
    val description: String? = null,
    @SerialName("opening_amount") val openingAmount: String = "0",
    @SerialName("credit_limit") val creditLimit: String? = null,
    @SerialName("statement_day") val statementDay: Int? = null,
    @SerialName("due_day") val dueDay: Int? = null,
    @SerialName("exclude_from_stats") val excludeFromStats: Boolean = false,
    val spendable: Boolean? = null,
    @SerialName("auto_rate") val autoRate: Boolean = false,
    @SerialName("transaction_count") val transactionCount: Int = 0,
)

@Serializable
data class AccountSummary(val assets: String, val liabilities: String, val total: String, val currency: String)

@Serializable
data class AccountTrend(@SerialName("account_id") val accountId: String, val currency: String, val balances: List<String> = emptyList())

@Serializable
data class CurrencyList(val currencies: List<String> = emptyList())

@Serializable
data class MarketRate(val rate: String, val exact: Boolean = true)

@Serializable
data class UserMe(
    val id: String,
    val email: String,
    @SerialName("base_currency") val baseCurrency: String,
    @SerialName("compact_numbers") val compactNumbers: Boolean = false,
    @SerialName("default_account_id") val defaultAccountId: String? = null,
    @SerialName("two_factor_enabled") val twoFactorEnabled: Boolean = false,
    @SerialName("start_from_template") val startFromTemplate: Boolean = true,
    @SerialName("notify_payments") val notifyPayments: Boolean = true,
    @SerialName("notify_budget") val notifyBudget: Boolean = true,
    @SerialName("notify_goals") val notifyGoals: Boolean = true,
    @SerialName("notify_email") val notifyEmail: Boolean = false,
)

/** One sign-in of the person's, for "Where you are signed in". */
@Serializable
data class SessionRow(
    val id: String,
    @SerialName("last_used_at") val lastUsedAt: String,
    @SerialName("user_agent") val userAgent: String? = null,
    @SerialName("ip_address") val ipAddress: String? = null,
    val current: Boolean = false,
)

@Serializable
data class EndedSessions(val ended: Int = 0)

@Serializable
data class EmailStatus(val configured: Boolean = false, val sender: String? = null)

@Serializable
data class AvailableAccount(val id: String, val name: String, val group: String, val balance: String)

@Serializable
data class AvailableBill(
    val id: String,
    val title: String,
    val amount: String,
    val date: String,
    val overdue: Boolean = false,
    val estimate: Boolean = false,
    val transfer: Boolean = false,
    val account: String? = null,
    val subscription: String? = null,
)

@Serializable
data class AvailableCardPayment(
    @SerialName("account_id") val accountId: String,
    val title: String,
    val amount: String,
    val date: String,
    val overdue: Boolean = false,
)

@Serializable
data class AvailableReserve(@SerialName("goal_id") val goalId: String, val name: String, val amount: String)

@Serializable
data class AvailableToSpend(
    val available: String,
    val balance: String,
    val currency: String,
    val today: String = "",
    @SerialName("period_start") val periodStart: String = "",
    val accounts: List<AvailableAccount> = emptyList(),
    val bills: List<AvailableBill> = emptyList(),
    @SerialName("bills_total") val billsTotal: String,
    @SerialName("card_payments") val cardPayments: List<AvailableCardPayment> = emptyList(),
    @SerialName("card_payments_total") val cardPaymentsTotal: String,
    val reserved: List<AvailableReserve> = emptyList(),
    @SerialName("reserved_total") val reservedTotal: String,
    /** Planned income: listed on its day, never counted. */
    val expected: List<AvailableBill> = emptyList(),
    @SerialName("kept_apart") val keptApart: List<AvailableAccount> = emptyList(),
    @SerialName("period_end") val periodEnd: String,
)

@Serializable
data class Totals(val currency: String, val income: String, val expense: String, val refunded: String = "0")

@Serializable
data class CategoryTotal(
    val category: String,
    @SerialName("category_id") val categoryId: String,
    val color: String,
    val total: String,
    val type: String,
    val count: Int = 0,
    val kind: String? = null,
)

/** `/transactions/categories` answers an object, not a bare list. */
@Serializable
data class CategoryTotals(val currency: String, val categories: List<CategoryTotal> = emptyList())

@Serializable
data class BalancePoint(val date: String, val total: String, val assets: String = "0", val liabilities: String = "0")

@Serializable
data class BalanceTrend(val currency: String, val points: List<BalancePoint> = emptyList())

@Serializable
data class MonthlyPoint(val month: String, val income: String, val expense: String)

@Serializable
data class Monthly(val currency: String, val months: List<MonthlyPoint> = emptyList())

@Serializable
data class BudgetTotals(val activity: String, val amount: String, val available: String, val percent: Int, val status: String)

@Serializable
data class BudgetPeriod(val start: String, val end: String, @SerialName("is_current") val isCurrent: Boolean = false)

@Serializable
data class IdName(val id: String, val name: String)

@Serializable
data class BudgetLine(
    val id: String,
    val name: String,
    val activity: String,
    val amount: String,
    val available: String,
    val percent: Int,
    val status: String,
    val carried: String = "0",
    @SerialName("moved_in") val movedIn: String = "0",
    @SerialName("moved_out") val movedOut: String = "0",
    val rollover: Boolean = false,
    val kind: String? = null,
    val categories: List<IdName> = emptyList(),
    @SerialName("runs_from") val runsFrom: String? = null,
    @SerialName("runs_until") val runsUntil: String? = null,
)

/** A limit for set dates: one total counted over its whole stretch. */
@Serializable
data class FixedLine(
    val id: String,
    val name: String,
    val activity: String,
    val amount: String,
    val available: String,
    val percent: Int,
    val status: String,
    @SerialName("start_date") val startDate: String,
    @SerialName("end_date") val endDate: String,
    val state: String = "active",
    @SerialName("days_left") val daysLeft: Int? = null,
    val categories: List<IdName> = emptyList(),
)

@Serializable
data class Budget(
    val currency: String,
    val period: BudgetPeriod? = null,
    val totals: BudgetTotals,
    val lines: List<BudgetLine> = emptyList(),
    @SerialName("fixed_lines") val fixedLines: List<FixedLine> = emptyList(),
    val attention: Int = 0,
)

@Serializable
data class Goal(
    val id: String,
    val name: String,
    val currency: String,
    val saved: String,
    @SerialName("target_amount") val targetAmount: String,
    val percent: Int,
    val reached: Boolean = false,
    val mode: String = "manual",
    val remaining: String = "0",
    val account: IdName? = null,
    @SerialName("monthly_amount") val monthlyAmount: String? = null,
    @SerialName("target_date") val targetDate: String? = null,
    @SerialName("months_left") val monthsLeft: Int? = null,
    @SerialName("needed_per_month") val neededPerMonth: String? = null,
    @SerialName("period_status") val periodStatus: String? = null,
    @SerialName("period_planned") val periodPlanned: String? = null,
    @SerialName("period_contributed") val periodContributed: String? = null,
)

@Serializable
data class NameRef(val name: String, val currency: String? = null, val id: String? = null)

@Serializable
data class CardRef(val name: String, @SerialName("last_digits") val lastDigits: String? = null)

/** A transaction as the lists and the detail sheet show it; the full record has more (items, places, links). */
@Serializable
data class Transaction(
    val id: String,
    val type: String,
    val amount: String,
    val currency: String,
    val category: String,
    @SerialName("category_color") val categoryColor: String? = null,
    val description: String? = null,
    @SerialName("transaction_date") val date: String,
    @SerialName("transaction_time") val time: String? = null,
    val planned: Boolean = false,
    val account: NameRef? = null,
    @SerialName("to_account") val toAccount: NameRef? = null,
    @SerialName("to_amount") val toAmount: String? = null,
    val vendor: NameRef? = null,
    @SerialName("refund_of") val refundOf: kotlinx.serialization.json.JsonElement? = null,
    @SerialName("payment_method") val paymentMethod: String? = null,
    @SerialName("exchange_rate") val exchangeRate: String = "1",
    @SerialName("base_amount") val baseAmount: String? = null,
    val tags: List<NameRef> = emptyList(),
    val card: CardRef? = null,
    val subscription: NameRef? = null,
    val group: NameRef? = null,
    @SerialName("attachment_count") val attachmentCount: Int = 0,
    @SerialName("link_count") val linkCount: Int = 0,
    val adjustment: Boolean = false,
    /** The items of a split purchase (only counted here; they are edited on the web). */
    val splits: List<kotlinx.serialization.json.JsonElement> = emptyList(),
)

/** For the filter pickers: a category (with its parent's id, for indenting) and a tag. */
@Serializable
data class CategoryItem(val id: String, val name: String, @SerialName("parent_id") val parentId: String? = null, val color: String? = null)

@Serializable
data class TagItem(val id: String, val name: String)

@Serializable
data class VendorItem(
    val id: String,
    val name: String,
    @SerialName("default_category") val defaultCategory: String? = null,
    @SerialName("default_tags") val defaultTags: List<NameRef> = emptyList(),
)

/** A category as the Categories screen shows it. */
@Serializable
data class Category(
    val id: String,
    val name: String,
    val color: String = "blue",
    @SerialName("parent_id") val parentId: String? = null,
    val parent: String? = null,
    @SerialName("child_count") val childCount: Int = 0,
    val kind: String? = null,
    @SerialName("effective_kind") val effectiveKind: String? = null,
    @SerialName("is_salary") val isSalary: Boolean = false,
    @SerialName("transaction_count") val transactionCount: Int = 0,
)

@Serializable
data class Tag(
    val id: String,
    val name: String,
    val color: String = "blue",
    @SerialName("transaction_count") val transactionCount: Int = 0,
)

@Serializable
data class Vendor(
    val id: String,
    val name: String,
    val address: String? = null,
    val contact: String? = null,
    val currency: String? = null,
    @SerialName("is_local") val isLocal: Boolean? = null,
    @SerialName("default_category") val defaultCategory: String? = null,
    @SerialName("default_tags") val defaultTags: List<NameRef> = emptyList(),
    val place: String? = null,
)

@Serializable
data class AccountBalancePoint(val date: String, val balance: String)

@Serializable
data class BalanceHistory(val currency: String, val points: List<AccountBalancePoint> = emptyList())

@Serializable
data class BalanceAfter(@SerialName("transaction_id") val transactionId: String, val balance: String)

/** A credit card's latest statement, worked out by the server each time. */
@Serializable
data class CardStatement(
    @SerialName("account_id") val accountId: String,
    val currency: String,
    @SerialName("statement_day") val statementDay: Int,
    @SerialName("due_day") val dueDay: Int,
    @SerialName("closed_on") val closedOn: String,
    @SerialName("due_on") val dueOn: String,
    @SerialName("statement_balance") val statementBalance: String,
    @SerialName("paid_since") val paidSince: String,
    val remaining: String,
    @SerialName("spent_since") val spentSince: String,
    @SerialName("owed_now") val owedNow: String,
    @SerialName("credit_limit") val creditLimit: String? = null,
    /** none, paid, due or overdue. */
    val state: String,
    @SerialName("days_until_due") val daysUntilDue: Int,
)

@Serializable
data class Subscription(
    val id: String,
    val name: String,
    val vendor: NameRef? = null,
    val amount: String,
    val currency: String,
    @SerialName("exchange_rate") val exchangeRate: String = "1",
    @SerialName("base_amount") val baseAmount: String = amount,
    val account: NameRef? = null,
    @SerialName("payment_method") val paymentMethod: String = "other",
    val category: String = "",
    @SerialName("interval_unit") val intervalUnit: String = "month",
    @SerialName("interval_count") val intervalCount: Int = 1,
    @SerialName("start_date") val startDate: String,
    val status: String = "active",
    @SerialName("last_paid_date") val lastPaidDate: String? = null,
    @SerialName("next_due_date") val nextDueDate: String? = null,
    @SerialName("is_overdue") val isOverdue: Boolean = false,
    @SerialName("monthly_base_cost") val monthlyBaseCost: String = "0",
    @SerialName("installments_total") val installmentsTotal: Int? = null,
    @SerialName("payments_made") val paymentsMade: Int = 0,
    @SerialName("installments_left") val installmentsLeft: Int? = null,
    @SerialName("remind_days_before") val remindDaysBefore: Int? = null,
    @SerialName("amount_varies") val amountVaries: Boolean = false,
)

@Serializable
data class SubscriptionSummary(
    @SerialName("active_count") val activeCount: Int,
    @SerialName("monthly_base_total") val monthlyBaseTotal: String,
    val currency: String,
)

/** A recurring payment found in the history, offered as a subscription. */
@Serializable
data class SubscriptionCandidate(
    @SerialName("vendor_id") val vendorId: String,
    @SerialName("vendor_name") val vendorName: String,
    val currency: String,
    val amount: String,
    @SerialName("amount_varies") val amountVaries: Boolean = false,
    @SerialName("interval_unit") val intervalUnit: String,
    @SerialName("interval_count") val intervalCount: Int = 1,
    val occurrences: Int = 0,
    @SerialName("next_due") val nextDue: String? = null,
    val confidence: String = "medium",
    val category: String = "",
)

@Serializable
data class TwoFactorSetup(
    val secret: String,
    @SerialName("otpauth_uri") val otpauthUri: String,
)

@Serializable
data class RecoveryCodes(@SerialName("recovery_codes") val recoveryCodes: List<String> = emptyList())
