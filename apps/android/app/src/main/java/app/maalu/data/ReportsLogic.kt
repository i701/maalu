package app.maalu.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

// The reports (Net worth, Compare, Trends), ported from apps/web/src/lib/{net-worth,compare,trends}.ts. The web tests are the spec.

private fun dec(s: String): BigDecimal = s.toBigDecimalOrNull() ?: BigDecimal.ZERO
private fun sum(values: List<String>): String = values.fold(BigDecimal.ZERO) { a, v -> a + dec(v) }.toPlainString()

// ---- Compare ---------------------------------------------------------------------------------------------------------------

enum class ComparePreset(val label: String) {
    LastMonth("Last month"), ThisMonth("This month"), Last30("Last 30 days"), ThisYear("This year"),
}

data class Range(val from: LocalDate, val to: LocalDate, val label: String)

/** The two stretches being compared: [now] is the one being looked at and [before] the one it is held against. */
data class Periods(val now: Range, val before: Range)

private fun monthRange(on: LocalDate): Range { val (a, b) = monthBounds(on); return Range(a, b, monthLabel(on)) }

/** The same month and day [years] earlier; 29 February becomes the 28th when that year has none. */
fun sameDayYearsAgo(day: LocalDate, years: Long): LocalDate = day.minusYears(years)

/**
 * The two periods a preset stands for on [today]. A month is the whole month (so this one is not over yet), a year is the
 * year so far held against the same days a year before, so the two are the same length.
 */
fun periodsFor(preset: ComparePreset, today: LocalDate): Periods = when (preset) {
    ComparePreset.ThisMonth -> Periods(monthRange(today), monthRange(today.minusMonths(1)))
    ComparePreset.LastMonth -> Periods(monthRange(today.minusMonths(1)), monthRange(today.minusMonths(2)))
    ComparePreset.Last30 -> Periods(
        Range(today.minusDays(29), today, "the last 30 days"),
        Range(today.minusDays(59), today.minusDays(30), "the 30 days before"),
    )
    ComparePreset.ThisYear -> Periods(
        Range(LocalDate.of(today.year, 1, 1), today, "${today.year} so far"),
        Range(LocalDate.of(today.year - 1, 1, 1), sameDayYearsAgo(today, 1), "the same days of ${today.year - 1}"),
    )
}

data class Change(
    val before: String,
    val now: String,
    /** now less before, exactly */
    val change: String,
    /** how much it moved as a share of before; null when before was nothing to compare with */
    val percent: Double?,
)

fun changeOf(before: String, now: String): Change = Change(before, now, (dec(now) - dec(before)).toPlainString(), percentChange(now, before))

data class CompareRow(val categoryId: String, val category: String, val color: String, val change: Change, val state: String)

/** Every category of one kind that has money in either period, biggest move first (in either direction). */
fun compareRows(before: List<CategoryTotal>, now: List<CategoryTotal>, type: String): List<CompareRow> {
    val rows = LinkedHashMap<String, CompareRow>()
    for (t in before.filter { it.type == type }) rows[t.categoryId] = CompareRow(t.categoryId, t.category, t.color, changeOf(t.total, "0"), "gone")
    for (t in now.filter { it.type == type }) {
        val prev = rows[t.categoryId]
        rows[t.categoryId] = CompareRow(t.categoryId, t.category, t.color, changeOf(prev?.change?.before ?: "0", t.total), if (prev != null) "both" else "new")
    }
    return rows.values.sortedWith(compareByDescending<CompareRow> { dec(it.change.change).abs() }.thenBy { it.category.lowercase() })
}

data class CompareTotals(val income: Change, val expense: Change, val kept: Change)

private fun total(cats: List<CategoryTotal>, type: String) = sum(cats.filter { it.type == type }.map { it.total })

/** Income, spending and what was kept (income less spending) in each period. Refunds are already taken off spending. */
fun compareTotals(before: List<CategoryTotal>, now: List<CategoryTotal>): CompareTotals {
    val bi = total(before, "income"); val be = total(before, "expense"); val ni = total(now, "income"); val ne = total(now, "expense")
    return CompareTotals(
        income = changeOf(bi, ni), expense = changeOf(be, ne),
        kept = changeOf((dec(bi) - dec(be)).toPlainString(), (dec(ni) - dec(ne)).toPlainString()),
    )
}

/** One plain sentence on how spending moved and which categories did it; only categories that moved the same way are named. */
fun spendingSentence(expense: Change, rows: List<CompareRow>, against: String, money: (String) -> String): String {
    if (dec(expense.now).signum() == 0 && dec(expense.before).signum() == 0) return "There is no spending in either period."
    val moved = dec(expense.change)
    if (moved.signum() == 0) return "Spending is the same as in $against."
    val up = moved.signum() > 0
    val share = expense.percent?.let { " (${Math.round(Math.abs(it))}%)" }.orEmpty()
    val head = "Spending is ${if (up) "up" else "down"} ${money(expense.change.removePrefix("-"))}$share on $against."
    val named = rows.filter { if (up) dec(it.change.change).signum() > 0 else dec(it.change.change).signum() < 0 }.take(3)
        .joinToString(", ") { "${it.category} ${if (up) "+" else "-"}${money(it.change.change.removePrefix("-"))}" }
    return if (named.isNotEmpty()) "$head Most of it: $named." else head
}

// ---- Trends ----------------------------------------------------------------------------------------------------------------

@Serializable
data class CategoryMonthRow(
    val type: String,
    @SerialName("category_id") val categoryId: String,
    val category: String,
    val color: String,
    val kind: String? = null,
    val parent: String? = null,
    val amounts: List<String> = emptyList(),
    val total: String = "0",
)

@Serializable
data class CategoryMonths(val currency: String, val months: List<String> = emptyList(), val categories: List<CategoryMonthRow> = emptyList())

val TrendRanges = listOf(6, 12, 24)

/** The first and last day to ask for so that the table ends with the month [today] is in and spans [months] months. */
fun trendBounds(months: Int, today: LocalDate): Pair<LocalDate, LocalDate> =
    today.minusMonths((months - 1).toLong()).withDayOfMonth(1) to monthBounds(today).second

/** "Mar 26" for "2026-03": short enough for a narrow column, with the year so a long range reads. */
fun monthColumn(month: String): String {
    val d = runCatching { LocalDate.parse("$month-01") }.getOrNull() ?: return month
    return "${d.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${(d.year % 100).toString().padStart(2, '0')}"
}

/** What every row came to in each month, added up exactly, for the footer. */
fun columnTotals(rows: List<CategoryMonthRow>, monthCount: Int): List<String> =
    List(monthCount) { i -> sum(rows.map { it.amounts.getOrElse(i) { "0" } }) }

/** How strongly to shade a cell: its share of the biggest figure in the table, 0 to 1. A refund and an empty month are not shaded. */
fun heat(value: String, max: Double): Float {
    val v = value.toDoubleOrNull() ?: return 0f
    return if (v > 0 && max > 0) minOf(v / max, 1.0).toFloat() else 0f
}

fun maxCell(rows: List<CategoryMonthRow>): Double = rows.maxOfOrNull { r -> r.amounts.maxOfOrNull { it.toDoubleOrNull() ?: 0.0 } ?: 0.0 } ?: 0.0

/** What a category averages over the months shown, to two places (display only). */
fun monthlyAverage(row: CategoryMonthRow): String =
    dec(row.total).divide(BigDecimal(maxOf(row.amounts.size, 1)), 2, RoundingMode.HALF_EVEN).toPlainString()

/** A figure for a narrow cell: no currency, two decimals until it is large enough not to need them, "–" for nothing. */
fun cellText(value: String): String {
    val v = dec(value)
    if (v.signum() == 0) return "–"
    val text = if (v.abs() >= BigDecimal(1000)) java.text.DecimalFormat("#,##0", java.text.DecimalFormatSymbols(Locale.US)).format(v)
    else java.text.DecimalFormat("#,##0.00", java.text.DecimalFormatSymbols(Locale.US)).format(v)
    return text
}

// ---- Net worth -------------------------------------------------------------------------------------------------------------

@Serializable
data class NetWorthDriver(val key: String, val amount: String)

@Serializable
data class NetWorthAccountChange(
    @SerialName("account_id") val accountId: String,
    val name: String,
    val group: String = "",
    val currency: String = "",
    val start: String,
    val end: String,
    val change: String,
)

@Serializable
data class NetWorthDrivers(
    val currency: String,
    @SerialName("start_date") val startDate: String,
    @SerialName("end_date") val endDate: String,
    val start: String,
    val end: String,
    val change: String,
    val drivers: List<NetWorthDriver> = emptyList(),
    val accounts: List<NetWorthAccountChange> = emptyList(),
)

val DriverLabels = mapOf(
    "income" to "Income", "spending" to "Spending", "adjustments" to "Balance adjustments",
    "transfers" to "Transfers across net worth", "exchange_rates" to "Exchange rates",
)

val DriverHelp = mapOf(
    "income" to "Money that came in, not counting refunds.",
    "spending" to "Money that went out, less what refunds gave back.",
    "adjustments" to "Corrections that made an account match its bank.",
    "transfers" to "Money moved to or from an account that is not part of net worth (archived, or left out of the stats).",
    "exchange_rates" to "Accounts in another currency are worth a different amount in your base currency when their rate changes.",
)

enum class NetPeriod(val label: String) { Last30("30 days"), Last90("3 months"), Last365("12 months"), ThisYear("This year") }

/** The first and last day for a period ending [today]. The default, 30 days, is always a full month of days. */
fun netPeriod(p: NetPeriod, today: LocalDate): Pair<LocalDate, LocalDate> = when (p) {
    NetPeriod.Last30 -> today.minusDays(29) to today
    NetPeriod.Last90 -> today.minusDays(89) to today
    NetPeriod.Last365 -> today.minusDays(364) to today
    NetPeriod.ThisYear -> LocalDate.of(today.year, 1, 1) to today
}

/** How much net worth moved as a share of where it started, or null when it started at or below zero. */
fun changePercent(start: String, change: String): Double? = percentChange((dec(start) + dec(change)).toPlainString(), start)

/** The drivers that are not zero, each with how long its bar is against the biggest one (0 to 1). */
data class DriverBar(val key: String, val label: String, val value: String, val fraction: Float)

fun driverBars(drivers: List<NetWorthDriver>): List<DriverBar> {
    val shown = drivers.filter { dec(it.amount).signum() != 0 }
    val max = shown.maxOfOrNull { dec(it.amount).abs() } ?: BigDecimal.ZERO
    return shown.map { DriverBar(it.key, DriverLabels[it.key] ?: it.key, it.amount, if (max.signum() == 0) 0f else dec(it.amount).abs().divide(max, 4, RoundingMode.HALF_EVEN).toFloat()) }
}

/** Two or three plain sentences: what net worth did and which drivers moved it most. Drivers that came to nothing are not mentioned. */
fun netWorthSentence(d: NetWorthDrivers, money: (String) -> String): String {
    val change = dec(d.change)
    if (change.signum() == 0 && d.drivers.all { dec(it.amount).signum() == 0 }) return "Net worth stayed at ${money(d.end)}."
    fun absolute(a: String) = money(a.removePrefix("-"))
    val percent = changePercent(d.start, d.change)
    val head = if (change.signum() == 0) "Net worth ended where it began, at ${money(d.end)}, but things moved underneath."
    else "Net worth ${if (change.signum() > 0) "rose" else "fell"} ${absolute(d.change)}${percent?.let { " (%.1f%%)".format(Locale.ENGLISH, Math.abs(it)) }.orEmpty()}, from ${money(d.start)} to ${money(d.end)}."
    val kept = dec(d.drivers.firstOrNull { it.key == "income" }?.amount ?: "0") + dec(d.drivers.firstOrNull { it.key == "spending" }?.amount ?: "0")
    val parts = mutableListOf<String>()
    if (kept.signum() != 0) parts += if (kept.signum() > 0) "You kept ${absolute(kept.toPlainString())} (income less spending)." else "You spent ${absolute(kept.negate().toPlainString())} more than you earned."
    val others = d.drivers.filter { it.key != "income" && it.key != "spending" && dec(it.amount).signum() != 0 }
        .sortedByDescending { dec(it.amount).abs() }
        .joinToString(", ") { "${(DriverLabels[it.key] ?: it.key).lowercase()} ${if (dec(it.amount).signum() > 0) "added" else "took"} ${absolute(it.amount)}" }
    if (others.isNotEmpty()) parts += "${others.replaceFirstChar { it.uppercase() }}."
    return (listOf(head) + parts).joinToString(" ")
}
