package app.maalu.data

import java.math.BigDecimal

data class StackPiece(val name: String, val rank: Int, val value: BigDecimal)

/** One month's bar (`2026-03`), its pieces bottom first. */
data class StackMonth(val month: String, val pieces: List<StackPiece>) {
    val total: BigDecimal get() = pieces.fold(BigDecimal.ZERO) { sum, p -> sum + p.value }
    fun value(name: String): BigDecimal = pieces.firstOrNull { it.name == name }?.value ?: BigDecimal.ZERO
}

/** [names] are the categories drawn, biggest first; the last is "Other" when [hasOther]. */
data class SpendingStack(val months: List<StackMonth>, val names: List<String>, val hasOther: Boolean) {
    fun total(name: String): BigDecimal = months.fold(BigDecimal.ZERO) { sum, m -> sum + m.value(name) }

    /** The figure for what is picked: a month, a category, both or neither. */
    fun amount(month: StackMonth?, held: String?): BigDecimal = when {
        month != null -> if (held != null) month.value(held) else month.total
        held != null -> total(held)
        else -> months.fold(BigDecimal.ZERO) { sum, m -> sum + m.total }
    }
}

/**
 * Spending per month for the last [count] months, stacked by the [top] biggest categories over them, the rest folded into
 * "Other". A refund that outweighs a month's spending in a category counts as nothing there. Null when nothing was spent.
 */
fun spendingStack(data: CategoryMonths, count: Int, top: Int = 4): SpendingStack? {
    val slots = data.months.indices.toList().takeLast(count)
    fun value(row: CategoryMonthRow, slot: Int) = (row.amounts.getOrNull(slot)?.toBigDecimalOrNull() ?: BigDecimal.ZERO).max(BigDecimal.ZERO)
    val ranked = data.categories.filter { it.type == "expense" }
        .map { row -> row to slots.fold(BigDecimal.ZERO) { sum, i -> sum + value(row, i) } }
        .filter { it.second.signum() > 0 }
        .sortedByDescending { it.second }
        .map { it.first }
    if (ranked.isEmpty()) return null
    val shown = ranked.take(top)
    val rest = ranked.drop(top)
    // a category of the person's own may already be called Other
    val other = if (shown.any { it.category == "Other" }) "Everything else" else "Other"
    val months = slots.map { slot ->
        val pieces = shown.mapIndexed { rank, row -> StackPiece(row.category, rank, value(row, slot)) } +
            StackPiece(other, shown.size, rest.fold(BigDecimal.ZERO) { sum, row -> sum + value(row, slot) })
        StackMonth(data.months[slot], pieces.filter { it.value.signum() > 0 })
    }
    return SpendingStack(months, shown.map { it.category } + if (rest.isEmpty()) emptyList() else listOf(other), rest.isNotEmpty())
}
