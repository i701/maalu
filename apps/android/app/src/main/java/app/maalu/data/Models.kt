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
)

@Serializable
data class UserMe(
    val id: String,
    val email: String,
    @SerialName("base_currency") val baseCurrency: String,
    @SerialName("compact_numbers") val compactNumbers: Boolean = false,
)

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
    val accounts: List<AvailableAccount> = emptyList(),
    val bills: List<AvailableBill> = emptyList(),
    @SerialName("bills_total") val billsTotal: String,
    @SerialName("card_payments") val cardPayments: List<AvailableCardPayment> = emptyList(),
    @SerialName("card_payments_total") val cardPaymentsTotal: String,
    val reserved: List<AvailableReserve> = emptyList(),
    @SerialName("reserved_total") val reservedTotal: String,
    @SerialName("period_end") val periodEnd: String,
)

/** Income and spending for a range, in the base currency (`/transactions/summary`). */
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
data class BudgetLine(
    val id: String,
    val name: String,
    val activity: String,
    val amount: String,
    val available: String,
    val percent: Int,
    val status: String,
)

@Serializable
data class Budget(
    val currency: String,
    val totals: BudgetTotals,
    val lines: List<BudgetLine> = emptyList(),
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
)

@Serializable
data class NameRef(val name: String, val currency: String? = null)

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
)
