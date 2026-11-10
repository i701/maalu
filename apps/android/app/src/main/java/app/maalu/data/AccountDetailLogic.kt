package app.maalu.data

import java.math.BigDecimal
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Ported from apps/web/src/lib/account-detail.ts, card-statement.ts and the adjustment preview in accounts.ts.

/** What a transaction did to one account, seen from that account's page. */
data class AccountEffect(val positive: Boolean, val amount: String, val currency: String, val counterpart: String?)

fun accountEffect(t: Transaction, accountId: String): AccountEffect {
    if (t.type == "transfer") {
        if (t.account?.id == accountId) {
            return AccountEffect(false, t.amount, t.currency, "To ${t.toAccount?.name ?: "a deleted account"}")
        }
        return AccountEffect(true, t.toAmount ?: t.amount, t.toAccount?.currency ?: t.currency, "From ${t.account?.name ?: "a deleted account"}")
    }
    return AccountEffect(t.type == "income", t.amount, t.currency, null)
}

/** The ranges the balance chart offers, in days. */
enum class HistoryRange(val days: Int, val label: String) { Month(30, "30 days"), Quarter(90, "90 days"), Year(365, "1 year") }

data class HistorySummary(val start: BigDecimal, val end: BigDecimal, val low: BigDecimal, val high: BigDecimal)

fun historySummary(points: List<AccountBalancePoint>): HistorySummary? {
    val values = points.mapNotNull { it.balance.toBigDecimalOrNull() }
    if (values.isEmpty()) return null
    return HistorySummary(values.first(), values.last(), values.min(), values.max())
}

enum class AdjustMode { Balance, Amount }

/** What an adjustment would do: the balance after, and the income or expense it records ([kind] null when nothing changes). */
data class AdjustPreview(val after: BigDecimal, val amount: BigDecimal, val kind: String?)

fun adjustmentPreview(current: String, mode: AdjustMode, typed: String): AdjustPreview? {
    if (!Regex("^-?\\d+(\\.\\d{1,4})?$").matches(typed.trim())) return null
    val value = typed.trim().toBigDecimal()
    val now = current.toBigDecimalOrNull() ?: return null
    val difference = if (mode == AdjustMode.Balance) value - now else value
    val after = if (mode == AdjustMode.Balance) value else now + value
    if (difference.signum() == 0) return AdjustPreview(after, BigDecimal.ZERO, null)
    return AdjustPreview(after, difference.abs(), if (difference.signum() > 0) "income" else "expense")
}

/** The body for `POST /accounts/{id}/adjust`: exactly one of the new balance or a signed amount, plus an optional note. */
fun adjustJson(mode: AdjustMode, typed: String, note: String): JsonObject = buildJsonObject {
    put(if (mode == AdjustMode.Balance) "new_balance" else "amount", typed.trim())
    note.trim().takeIf { it.isNotEmpty() }?.let { put("note", it) }
}

/** The add form for repaying a card: a transfer into it from [fromId], for what is left on the statement. */
fun repayForm(card: Account, remaining: String, fromId: String?): AddForm = AddForm(
    type = "transfer", amount = tidyAmount(remaining), accountId = fromId, toAccountId = card.id,
    note = "Repay ${card.name}",
)

/** "Pay MVR 500.00 by 12 Nov (in 4 days)", "overdue by 3 days", or "Paid" / "Nothing owed" for the settled states. */
fun statementLine(s: CardStatement): String = when (s.state) {
    "none" -> "Nothing was owed when the statement closed"
    "paid" -> "Statement paid"
    "overdue" -> "Pay ${formatMoney(s.remaining, s.currency)}: overdue by ${-s.daysUntilDue} ${if (-s.daysUntilDue == 1) "day" else "days"}"
    else -> "Pay ${formatMoney(s.remaining, s.currency)} by ${shortDate(s.dueOn)}" + when (s.daysUntilDue) { 0 -> " (today)"; 1 -> " (tomorrow)"; else -> " (in ${s.daysUntilDue} days)" }
}
