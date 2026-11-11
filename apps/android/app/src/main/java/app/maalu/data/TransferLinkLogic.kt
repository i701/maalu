package app.maalu.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.math.BigDecimal

// Linking two entries into one transfer: a move of your own money entered twice (an expense in one account and an income in another)
// becomes one transfer. The server finds likely pairs and does the merge; this is what the screens need to offer it. Ported from
// apps/web/src/lib/transfer-link.ts.

/** A pair that looks like one move of your own money entered twice. */
@Serializable
data class TransferSuggestion(val expense: Transaction, val income: Transaction, @SerialName("days_apart") val daysApart: Int = 0)

/** Whether a transaction can be the expense side: money that left an account, posted, not a correction, and nothing that would be lost (items) or contradicted (refunds). */
fun canBeExpenseSide(t: Transaction): Boolean =
    t.type == "expense" && t.account != null && !t.planned && !t.adjustment && t.splits.isEmpty() && (t.refundedAmount.toBigDecimalOrNull() ?: BigDecimal.ZERO).signum() == 0

/** Whether a transaction can be the income side: money that arrived in an account, posted, and not a refund (money back for a purchase) or a correction. */
fun canBeIncomeSide(t: Transaction): Boolean =
    t.type == "income" && t.account != null && !t.planned && !t.adjustment && !t.isRefund

/** Whether a transaction could be half of a merged transfer at all (so its details offer "Make a transfer"). */
fun canLinkAsTransfer(t: Transaction): Boolean = canBeExpenseSide(t) || canBeIncomeSide(t)

/** Whether [other] could be the other half of [base]: the opposite side, in a different account. */
fun isCounterpart(base: Transaction, other: Transaction): Boolean = when {
    canBeExpenseSide(base) -> canBeIncomeSide(other) && other.account?.id != base.account?.id
    canBeIncomeSide(base) -> canBeExpenseSide(other) && other.account?.id != base.account?.id
    else -> false
}

/** The expense and the income of two entries, in that order, or null when they are not that. */
fun pairOf(a: Transaction, b: Transaction): Pair<Transaction, Transaction>? = when {
    canBeExpenseSide(a) && canBeIncomeSide(b) && a.account?.id != b.account?.id -> a to b
    canBeExpenseSide(b) && canBeIncomeSide(a) && a.account?.id != b.account?.id -> b to a
    else -> null
}

private fun amountOf(t: Transaction): BigDecimal = t.amount.toBigDecimalOrNull() ?: BigDecimal.ZERO

/** The merge button's words: "Merge with 1 matching entry", "Merge with 2 matching entries". */
fun mergeLabel(count: Int): String = if (count == 1) "Merge with 1 matching entry" else "Merge with $count matching entries"

private fun dayGap(a: String, b: String): Long = runCatching { Math.abs(java.time.temporal.ChronoUnit.DAYS.between(java.time.LocalDate.parse(a), java.time.LocalDate.parse(b))) }.getOrDefault(Long.MAX_VALUE)

/** "same day", "1 day apart", "2 days apart". */
fun daysApartText(days: Int): String = if (days == 0) "same day" else "$days ${if (days == 1) "day" else "days"} apart"

/** The body for `POST /transactions/link-transfer` and `/transfer-suggestions/dismiss`. */
fun pairJson(expenseId: String, incomeId: String): JsonObject = buildJsonObject { put("expense_id", expenseId); put("income_id", incomeId) }

/** What the confirmation says: where the money goes, what becomes of the two entries and what is dropped. */
fun linkSentence(expense: Transaction, income: Transaction): String {
    val from = expense.account?.name.orEmpty(); val to = income.account?.name.orEmpty()
    val arriving = if (expense.currency == income.currency) "" else ", arriving as ${formatMoneyFull(income.amount, income.currency)}"
    return "Move ${formatMoneyFull(expense.amount, expense.currency)} from $from to $to$arriving? The expense becomes the transfer and the income goes to the trash. " +
        "Balances stay as they are, and neither counts as spending or income any more. The expense's category and vendor are dropped, because transfers have none."
}

const val LINKED_MESSAGE = "Made one transfer. The other entry is in the trash."
