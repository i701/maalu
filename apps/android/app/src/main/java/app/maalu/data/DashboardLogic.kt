package app.maalu.data

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

// Ported from apps/web/src/lib/dashboard.ts: keep the two in step (the web tests are the spec).

/** First and last day (inclusive) of the calendar month containing a date. */
fun monthBounds(on: LocalDate): Pair<LocalDate, LocalDate> {
    val start = on.withDayOfMonth(1)
    return start to start.plusMonths(1).minusDays(1)
}

fun monthLabel(on: LocalDate): String =
    "${on.month.getDisplayName(TextStyle.FULL, Locale.ENGLISH)} ${on.year}"

/** Percent change from [previous] to [current]; null when there is nothing above zero to compare with. */
fun percentChange(current: String, previous: String): Double? {
    val prev = previous.toBigDecimalOrNull() ?: return null
    if (prev.signum() <= 0) return null
    val cur = current.toBigDecimalOrNull() ?: return null
    return cur.subtract(prev).multiply(BigDecimal(100)).divide(prev, 6, RoundingMode.HALF_EVEN).toDouble()
}

data class SpendingRow(val name: String, val total: BigDecimal, val share: Double, val color: String?)

/** The [top] biggest expense categories, the rest folded into one "Other" row. */
fun spendingRows(categories: List<CategoryTotal>, top: Int = 6): List<SpendingRow> {
    val expenses = categories
        .filter { it.type == "expense" }
        .mapNotNull { c -> c.total.toBigDecimalOrNull()?.takeIf { it.signum() > 0 }?.let { Triple(c.category, it, c.color) } }
        .sortedByDescending { it.second }
    val sum = expenses.fold(BigDecimal.ZERO) { acc, e -> acc + e.second }
    if (sum.signum() == 0) return emptyList()
    val head = expenses.take(top).map { Triple(it.first, it.second, it.third as String?) }
    val rest = expenses.drop(top).fold(BigDecimal.ZERO) { acc, e -> acc + e.second }
    val rows = if (rest.signum() > 0) head + Triple("Other", rest, null) else head
    return rows.map { (name, total, color) -> SpendingRow(name, total, total.divide(sum, 6, RoundingMode.HALF_EVEN).toDouble(), color) }
}

/** Income less spending: what was kept. Exact, on decimals. */
fun kept(income: String, expense: String): String =
    ((income.toBigDecimalOrNull() ?: BigDecimal.ZERO) - (expense.toBigDecimalOrNull() ?: BigDecimal.ZERO)).toPlainString()

enum class Kind(val label: String) { Need("Needs"), Want("Wants"), Unsorted("Not sorted") }

data class KindShare(val kind: Kind, val total: BigDecimal, val share: Double)

/** How spending divides into needs, wants and not sorted; null when nothing was spent (port of kindShares). */
fun kindShares(categories: List<CategoryTotal>): List<KindShare>? {
    val spending = categories.filter { it.type == "expense" }
    val rows = Kind.entries.map { k ->
        val key = when (k) { Kind.Need -> "need"; Kind.Want -> "want"; Kind.Unsorted -> null }
        k to spending.filter { it.kind == key }.fold(BigDecimal.ZERO) { a, c -> a + (c.total.toBigDecimalOrNull() ?: BigDecimal.ZERO) }
    }
    val positive = rows.map { it.second.max(BigDecimal.ZERO) }
    val sum = positive.fold(BigDecimal.ZERO, BigDecimal::add)
    if (sum.signum() == 0) return null
    return rows.mapIndexed { i, (k, t) -> KindShare(k, t, positive[i].divide(sum, 6, RoundingMode.HALF_EVEN).toDouble()) }
}

/** What a transaction is called in a list: its description, else its vendor, else its category. */
fun Transaction.title(): String = when {
    type == "transfer" -> description?.takeIf { it.isNotBlank() } ?: "${account?.name ?: "?"} → ${toAccount?.name ?: "?"}"
    !description.isNullOrBlank() -> description
    vendor != null -> vendor.name
    else -> category
}

/** `10 Nov`, from an ISO date. */
fun shortDate(iso: String): String {
    val d = LocalDate.parse(iso)
    return "${d.dayOfMonth} ${d.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)}"
}
