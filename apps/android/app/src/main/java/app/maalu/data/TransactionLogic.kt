package app.maalu.data

import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

/** "Today", "Yesterday", else "Tue 10 Nov" (with the year when it is not this one). */
fun dayLabel(iso: String, today: LocalDate = LocalDate.now()): String {
    val d = LocalDate.parse(iso)
    return when {
        d == today -> "Today"
        d == today.minusDays(1) -> "Yesterday"
        d == today.plusDays(1) -> "Tomorrow"
        else -> {
            val day = d.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
            val month = d.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
            "$day ${d.dayOfMonth} $month" + if (d.year != today.year) " ${d.year}" else ""
        }
    }
}

/** `14:32:00` becomes `14:32`; null stays null (the time is optional and has no zone). */
fun shortTime(time: String?): String? = time?.take(5)

val PaymentMethodLabels = mapOf(
    "cash" to "Cash",
    "bank_transfer" to "Bank transfer",
    "debit_card" to "Debit card",
    "credit_card" to "Credit card",
    "other" to "Other",
)

val Transaction.isRefund: Boolean get() = refundOf != null && refundOf !is kotlinx.serialization.json.JsonNull

/** Transactions grouped under their day, keeping the order the server gave (newest first). */
fun groupByDay(items: List<Transaction>): List<Pair<String, List<Transaction>>> {
    val out = LinkedHashMap<String, MutableList<Transaction>>()
    for (t in items) out.getOrPut(t.date) { mutableListOf() }.add(t)
    return out.map { it.key to it.value }
}
