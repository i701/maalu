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
)

/** `/transactions/categories` answers an object, not a bare list. */
@Serializable
data class CategoryTotals(val currency: String, val categories: List<CategoryTotal> = emptyList())
