package app.maalu.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import java.math.BigDecimal
import java.math.RoundingMode
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

private val Money = DecimalFormat("#,##0.00", DecimalFormatSymbols(Locale.US))

/**
 * The person's "short numbers" setting (Settings > Numbers). When on, every amount of a thousand and over is written short
 * ("MVR 1.23K"); it is Compose state, so screens showing amounts redraw when it changes.
 */
object NumberPrefs {
    var short by androidx.compose.runtime.mutableStateOf(false)
    const val SHORT_FROM = 1_000L
}

/** `"-1234.5000"`, `"MVR"` becomes `-MVR 1,234.50`. Display only: amounts stay strings elsewhere. */
fun formatMoney(amount: String, currency: String): String {
    if (NumberPrefs.short) return formatMoneyShort(amount, currency, NumberPrefs.SHORT_FROM)
    return formatMoneyFull(amount, currency)
}

/** Always the exact figure, whatever the setting. */
fun formatMoneyFull(amount: String, currency: String): String {
    val value = try { BigDecimal(amount) } catch (e: NumberFormatException) { return "$currency $amount" }
    val text = Money.format(value.abs())
    return if (value.signum() < 0) "-$currency $text" else "$currency $text"
}

val AccountGroupLabels = mapOf(
    "cash" to "Cash",
    "accounts" to "Bank accounts",
    "card" to "Credit cards",
    "savings" to "Savings",
    "prepaid" to "Prepaid",
    "investments" to "Investments",
    "overdrafts" to "Overdrafts",
    "loan" to "Loans",
    "insurance" to "Insurance",
    "others" to "Others",
)

fun groupLabel(group: String) = AccountGroupLabels[group] ?: group.replaceFirstChar { it.uppercase() }

private val Units = listOf("" to BigDecimal.ONE, "K" to BigDecimal("1E3"), "M" to BigDecimal("1E6"), "B" to BigDecimal("1E9"), "T" to BigDecimal("1E12"))

/**
 * A short form for tight places: from 10,000 up ("MVR 513.58M"); below that the full figure.
 * The exact amount should stay a tap away wherever this is shown.
 */
fun formatMoneyShort(amount: String, currency: String, from: Long = 10_000): String {
    val value = amount.toBigDecimalOrNull() ?: return "$currency $amount"
    if (value.abs() < BigDecimal(from)) return formatMoneyFull(amount, currency)
    val (suffix, unit) = Units.last { value.abs() >= it.second }
    val text = value.abs().divide(unit, 2, RoundingMode.HALF_EVEN).stripTrailingZeros().toPlainString()
    return (if (value.signum() < 0) "-" else "") + "$currency $text$suffix"
}

/** `"1234.5"` becomes `1,234.50`, with no currency (when one is not known). */
fun formatNumber(amount: String): String =
    amount.toBigDecimalOrNull()?.let { (if (it.signum() < 0) "-" else "") + Money.format(it.abs()) } ?: amount
