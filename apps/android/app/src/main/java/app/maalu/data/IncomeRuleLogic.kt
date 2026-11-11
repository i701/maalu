package app.maalu.data

import java.math.BigDecimal
import java.math.RoundingMode

// The 50/30/20 rule on the dashboard: at most half of income on needs, at most 30% on wants, at least 20% kept. It is worked out from the
// category totals the dashboard already has, so it follows the same rules as every report (no transfers or adjustments, refunds taken off).

enum class RuleKey(val label: String, val target: Int) { Need("Needs", 50), Want("Wants", 30), Save("Kept", 20) }

/** `On`: within the target. `Over`: spent more than the limit. `Below`: kept less than the goal. */
enum class RuleStatus(val text: String) { On("On target"), Over("Over target"), Below("Below target") }

data class RuleRow(val key: RuleKey, val amount: BigDecimal, val percent: Double, val status: RuleStatus) {
    val label: String get() = key.label
    val target: Int get() = key.target
}

data class IncomeRule(val income: BigDecimal, val rows: List<RuleRow>, val unsortedAmount: BigDecimal?, val unsortedPercent: Double?)

private fun ofIncome(amount: BigDecimal, income: BigDecimal): Double =
    amount.multiply(BigDecimal(1000)).divide(income, 0, RoundingMode.HALF_UP).toDouble() / 10.0

private fun sum(values: List<String>): BigDecimal = values.fold(BigDecimal.ZERO) { a, v -> a + (v.toBigDecimalOrNull() ?: BigDecimal.ZERO) }

/**
 * How the period divides against the rule. Needs and wants are the spending in those kinds; **kept is income less all spending** (money left
 * over, not a transfer to savings), so it can be negative. Spending in categories with no kind counts against kept but is not judged. Null
 * when there was no income to compare with.
 */
fun incomeRule(categories: List<CategoryTotal>): IncomeRule? {
    val income = sum(categories.filter { it.type == "income" }.map { it.total })
    if (income.signum() <= 0) return null
    val spending = categories.filter { it.type == "expense" }
    fun kind(k: String?) = sum(spending.filter { it.kind == k }.map { it.total })
    val kept = income - sum(spending.map { it.total })
    fun row(key: RuleKey, amount: BigDecimal): RuleRow {
        val percent = ofIncome(amount, income)
        val status = when {
            key == RuleKey.Save -> if (percent >= key.target) RuleStatus.On else RuleStatus.Below
            else -> if (percent <= key.target) RuleStatus.On else RuleStatus.Over
        }
        return RuleRow(key, amount, percent, status)
    }
    val unsorted = kind(null)
    return IncomeRule(
        income, listOf(row(RuleKey.Need, kind("need")), row(RuleKey.Want, kind("want")), row(RuleKey.Save, kept)),
        unsorted.takeIf { it.signum() > 0 }, unsorted.takeIf { it.signum() > 0 }?.let { ofIncome(it, income) },
    )
}

/** "50%", "12.5%": a whole percent without a decimal. */
fun percentText(p: Double): String = if (p == Math.floor(p) && !p.isInfinite()) "${p.toLong()}%" else "${"%.1f".format(java.util.Locale.ENGLISH, p)}%"

/** "Up to 50%" for needs and wants, "At least 20%" for what is kept. */
fun targetText(key: RuleKey): String = if (key == RuleKey.Save) "At least ${key.target}%" else "Up to ${key.target}%"
