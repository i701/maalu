package app.maalu.data

import kotlinx.serialization.Serializable

// The market rate of a foreign currency against the base currency over time (the web's rate history on an account's card).

@Serializable
data class RatePoint(val date: String, val rate: String)

@Serializable
data class RateHistory(val base: String, val quote: String, val points: List<RatePoint> = emptyList(), val source: String = "")

/** The ranges the history offers, in days. */
val RATE_RANGES = listOf(30, 90, 365)

data class RateSummary(val first: Double, val last: Double, val low: Double, val high: Double, val change: Double)

/** The start, end, range and movement (in percent) of a series of rates, oldest first; null with no points. */
fun summarizeRates(points: List<RatePoint>): RateSummary? {
    val values = points.mapNotNull { it.rate.toDoubleOrNull() }
    if (values.isEmpty()) return null
    val first = values.first(); val last = values.last()
    return RateSummary(first, last, values.min(), values.max(), if (first == 0.0) 0.0 else (last - first) / first * 100)
}

/** A rate without needless zeros: 15.4 not 15.40000000, but never fewer than the four decimals that matter for a currency like the rufiyaa. */
fun formatRate(value: Double): String = java.math.BigDecimal(value).setScale(4, java.math.RoundingMode.HALF_UP).stripTrailingZeros().toPlainString()

/** "+1.2%" or "-0.4%": how far the rate moved. */
fun changeText(change: Double): String {
    val text = "%.1f".format(java.util.Locale.ENGLISH, change)
    return if (text == "-0.0" || text == "0.0") "0.0%" else "${if (change > 0) "+" else ""}$text%"
}
