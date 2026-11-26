package app.maalu.data

import java.time.LocalDate
import java.time.format.DateTimeFormatter
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

private val LongDay = DateTimeFormatter.ofPattern("EEEE d MMMM yyyy", Locale.ENGLISH)

/** "Tuesday 10 November 2026", with ", 14:32" when there is a time: the detail sheet's line under the amount. */
fun longWhen(date: String, time: String?): String = LocalDate.parse(date).format(LongDay) + (shortTime(time)?.let { ", $it" } ?: "")

/** The category on a row ("Transfer" for a transfer), with how many more a split touches ("Groceries +1"). */
fun Transaction.rowTag(): String {
    if (type == "transfer") return "Transfer"
    val categories = if (splits.size > 1) splits.map { it.category }.distinct() else listOf(category)
    return if (categories.size > 1) "${categories[0]} +${categories.size - 1}" else categories[0]
}

/** A planned transaction whose day has passed: it just stays planned, the app calls it overdue. */
fun Transaction.isOverdue(today: LocalDate = LocalDate.now()): Boolean = planned && LocalDate.parse(date) < today
