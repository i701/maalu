package app.maalu.data

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

private val Money = DecimalFormat("#,##0.00", DecimalFormatSymbols(Locale.US))

/** `"-1234.5000"`, `"MVR"` becomes `-MVR 1,234.50`. Display only: amounts stay strings elsewhere. */
fun formatMoney(amount: String, currency: String): String {
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
    if (value.abs() < BigDecimal(from)) return formatMoney(amount, currency)
    val (suffix, unit) = Units.last { value.abs() >= it.second }
    val text = value.abs().divide(unit, 2, RoundingMode.HALF_EVEN).stripTrailingZeros().toPlainString()
    return (if (value.signum() < 0) "-" else "") + "$currency $text$suffix"
}
