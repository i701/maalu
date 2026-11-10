package app.maalu.data

import java.math.BigDecimal
import java.time.LocalDate
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** What the add form holds. Money stays a string (what was typed) until it is sent. */
data class AddForm(
    val type: String = "expense",
    val amount: String = "",
    val accountId: String? = null,
    val toAccountId: String? = null,
    val toAmount: String = "",
    val category: String = "",
    val vendor: String = "",
    val date: String = LocalDate.now().toString(),
    val time: String? = null,
    /** Turns on by itself for a future date, until the person sets it. */
    val planned: Boolean = false,
    val plannedTouched: Boolean = false,
    val method: String = "other",
    val methodTouched: Boolean = false,
    val rate: String = "1",
    val tags: List<String> = emptyList(),
    val note: String = "",
)

/** What each account group suggests as the payment method (port of SUGGESTED_PAYMENT_METHOD). */
fun suggestedMethod(group: String): String = when (group) {
    "cash" -> "cash"
    "accounts", "savings", "overdrafts" -> "bank_transfer"
    "card" -> "credit_card"
    else -> "other"
}

/** Digits and at most one dot, at most four decimals: what an amount field accepts as you type. */
fun cleanAmount(input: String): String {
    val out = StringBuilder()
    var dot = false
    for (c in input) {
        when {
            c.isDigit() -> out.append(c)
            c == '.' && !dot -> { dot = true; out.append(c) }
        }
    }
    val text = out.toString().take(15)
    val i = text.indexOf('.')
    return if (i >= 0 && text.length - i - 1 > 4) text.take(i + 5) else text
}

fun isPositive(text: String): Boolean = text.trim().toBigDecimalOrNull()?.let { it.signum() > 0 } == true

fun isFuture(date: String, today: LocalDate = LocalDate.now()): Boolean =
    runCatching { LocalDate.parse(date).isAfter(today) }.getOrDefault(false)

/** Moving the date also moves "planned", until the person has chosen it themselves (as on the web). */
fun AddForm.withDate(date: String, today: LocalDate = LocalDate.now()): AddForm =
    copy(date = date, planned = if (plannedTouched) planned else isFuture(date, today))

enum class FormField { Amount, Account, ToAccount, ToAmount, Category, Rate }

/** What is wrong, in words, and where. */
data class FormProblem(val field: FormField, val message: String)

/**
 * The first thing wrong with the form, or null when it can be sent. The server checks everything again
 * (and its own refusals are shown too); this saves a trip for the common slips.
 */
fun AddForm.problem(accounts: List<Account>, baseCurrency: String): FormProblem? {
    if (!isPositive(amount)) return FormProblem(FormField.Amount, "Enter an amount above zero.")
    val from = accounts.firstOrNull { it.id == accountId }
    if (type == "transfer") {
        val to = accounts.firstOrNull { it.id == toAccountId }
        if (from == null) return FormProblem(FormField.Account, "Pick the account the money leaves.")
        if (to == null) return FormProblem(FormField.ToAccount, "Pick the account it arrives in.")
        if (from.id == to.id) return FormProblem(FormField.ToAccount, "A transfer needs two different accounts.")
        if (from.currency != to.currency && !isPositive(toAmount)) return FormProblem(FormField.ToAmount, "Enter how much arrives in ${to.currency}.")
        return null
    }
    // the API refuses an income or expense with no category
    if (category.isBlank()) return FormProblem(FormField.Category, "Choose a category.")
    val currency = from?.currency ?: baseCurrency
    if (currency != baseCurrency && !isPositive(rate)) return FormProblem(FormField.Rate, "Enter the exchange rate.")
    return null
}

/** The request body for `POST /transactions`. Blank optional fields are left out. */
fun AddForm.toJson(accounts: List<Account>, baseCurrency: String): JsonObject {
    val from = accounts.firstOrNull { it.id == accountId }
    val to = accounts.firstOrNull { it.id == toAccountId }
    return buildJsonObject {
        put("type", type)
        put("amount", amount.trim())
        put("transaction_date", date)
        time?.let { put("transaction_time", if (it.length == 5) "$it:00" else it) }
        if (planned) put("planned", true)
        from?.let { put("account_id", it.id) }
        if (type == "transfer") {
            to?.let { put("to_account_id", it.id) }
            if (from != null && to != null && from.currency != to.currency) put("to_amount", toAmount.trim())
        } else {
            category.trim().takeIf { it.isNotEmpty() }?.let { put("category", it) }
            vendor.trim().takeIf { it.isNotEmpty() }?.let { put("vendor_name", it) }
            put("payment_method", method)
            val currency = from?.currency ?: baseCurrency
            if (currency != baseCurrency) { put("currency", currency); put("exchange_rate", rate.trim()) }
            if (tags.isNotEmpty()) put("tags", JsonArray(tags.map { JsonPrimitive(it) }))
        }
        note.trim().takeIf { it.isNotEmpty() }?.let { put("description", it) }
    }
}

/** "1.00000000" as "1", "15.4200" as "15.42": an account's stored rate in a form a person would type. */
fun tidyRate(rate: String): String = rate.toBigDecimalOrNull()?.stripTrailingZeros()?.toPlainString() ?: rate

val BigDecimal.isOne: Boolean get() = compareTo(BigDecimal.ONE) == 0
