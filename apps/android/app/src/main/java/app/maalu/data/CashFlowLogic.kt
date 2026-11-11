package app.maalu.data

import java.math.BigDecimal
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

// The dashboard's cash flow: income and expenses per month, what was kept (income less expenses) and the running total of it.

/** One month: what came in and went out, what was [kept] (negative when overspent) and the [running] total of kept from the first month shown. */
data class NetRow(val month: String, val income: BigDecimal, val expense: BigDecimal, val kept: BigDecimal, val running: BigDecimal)

/** The months shown, oldest first, from the last [n] of what the API sent (it sends them oldest first). */
fun lastMonths(months: List<MonthlyPoint>, n: Int): List<MonthlyPoint> = months.takeLast(n)

/** Kept per month and its running total, added exactly. Expenses already have refunds taken off, so a refund-heavy month can keep more than it earned. */
fun netRows(months: List<MonthlyPoint>): List<NetRow> {
    var running = BigDecimal.ZERO
    return months.map { m ->
        val income = m.income.toBigDecimalOrNull() ?: BigDecimal.ZERO
        val expense = m.expense.toBigDecimalOrNull() ?: BigDecimal.ZERO
        val kept = income - expense
        running += kept
        NetRow(m.month, income, expense, kept, running)
    }
}

/** "Nov" from "2026-11". */
fun monthShort(month: String): String = runCatching { LocalDate.parse("$month-01").month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH) }.getOrDefault(month)
