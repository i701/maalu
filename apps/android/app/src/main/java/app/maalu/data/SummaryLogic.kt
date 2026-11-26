package app.maalu.data

import java.math.BigDecimal
import kotlin.math.roundToInt

/** The share of [whole] that [part] is, kept within 0 to 1; null when there is no whole to divide. */
fun shareOf(part: BigDecimal, whole: BigDecimal): Float? =
    if (whole.signum() <= 0) null else (part.toDouble() / whole.toDouble()).coerceIn(0.0, 1.0).toFloat()

/** How this month's spending moved against last month's, in whole percent; null with nothing to compare with. */
fun spendingChangeText(current: String, previous: String): String? {
    val percent = percentChange(current, previous)?.roundToInt() ?: return null
    return when {
        percent > 0 -> "Up $percent% on last month"
        percent < 0 -> "Down ${-percent}% on last month"
        else -> "Same as last month"
    }
}

/** What each type of account holds in the base currency, in the order the groups first appear; what is owed counts as the amount owed. */
fun heldByGroup(accounts: List<Account>): List<Pair<String, BigDecimal>> =
    accounts.groupBy { it.group }.map { (group, list) ->
        group to list.fold(BigDecimal.ZERO) { sum, a -> sum + (a.baseBalance.toBigDecimalOrNull() ?: BigDecimal.ZERO).abs() }
    }
