package app.maalu.data

import java.math.BigDecimal
import java.time.LocalDate
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
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
    /** Where it happened (both coordinates as typed to six decimals, or both blank) and an optional name for the spot. */
    val latitude: String = "",
    val longitude: String = "",
    val place: String = "",
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

/**
 * The form after choosing [a] as the account (the source account of a transfer too): its exchange rate and its usual way of
 * paying come with it, and everything else (the type, the amount, the other account, the note) stays exactly as it was.
 */
fun AddForm.withAccount(a: Account): AddForm =
    copy(accountId = a.id, rate = tidyRate(a.exchangeRate), method = if (methodTouched) method else suggestedMethod(a.group))

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
        if (latitude.isNotBlank() && longitude.isNotBlank()) {
            put("latitude", latitude.trim()); put("longitude", longitude.trim())
            place.trim().takeIf { it.isNotEmpty() }?.let { put("place", it) }
        }
    }
}

/** "1.00000000" as "1", "15.4200" as "15.42": an account's stored rate in a form a person would type. */
fun tidyRate(rate: String): String = rate.toBigDecimalOrNull()?.stripTrailingZeros()?.toPlainString() ?: rate

val BigDecimal.isOne: Boolean get() = compareTo(BigDecimal.ONE) == 0

/** What picking a vendor adds to the form: its usual category and tags. */
data class VendorFill(val category: String? = null, val tags: List<String>? = null)

/**
 * A vendor's defaults fill only what is still empty (port of defaultsToFill): the category when none is
 * chosen, the tags when there are none. What was already chosen is never overwritten.
 */
fun VendorItem.defaultsFor(form: AddForm): VendorFill = VendorFill(
    category = defaultCategory?.takeIf { form.category.isBlank() },
    tags = defaultTags.map { it.name }.takeIf { it.isNotEmpty() && form.tags.isEmpty() },
)

/** The form after picking [vendor]: its name, plus whatever its defaults may fill in. */
fun AddForm.withVendor(vendor: VendorItem): AddForm {
    val fill = vendor.defaultsFor(this)
    return copy(vendor = vendor.name, category = fill.category ?: category, tags = fill.tags ?: tags)
}

/** "100.0000" as "100", "45.5000" as "45.5": what the API stored, as a person would type it. */
fun tidyAmount(amount: String): String = amount.toBigDecimalOrNull()?.stripTrailingZeros()?.toPlainString() ?: amount

/** Refunds and balance adjustments have their own rules, so they are not edited in this form. */
fun Transaction.canEdit(): Boolean = !adjustment && !isRefund

/** The form filled in from a saved transaction, ready to edit. */
fun formFrom(t: Transaction): AddForm = AddForm(
    type = t.type,
    amount = tidyAmount(t.amount),
    accountId = t.account?.id,
    toAccountId = t.toAccount?.id,
    toAmount = t.toAmount?.let(::tidyAmount).orEmpty(),
    category = if (t.type == "transfer") "" else t.category,
    vendor = t.vendor?.name.orEmpty(),
    date = t.date,
    time = shortTime(t.time),
    // an existing transaction keeps what it has: the date does not flip "planned" under the person
    planned = t.planned,
    plannedTouched = true,
    method = t.paymentMethod ?: "other",
    methodTouched = true,
    rate = tidyRate(t.exchangeRate),
    tags = t.tags.map { it.name },
    note = t.description.orEmpty(),
    latitude = t.latitude.orEmpty(), longitude = t.longitude.orEmpty(), place = t.place.orEmpty(),
)

private fun sameNumber(a: String, b: String): Boolean {
    val x = a.trim().toBigDecimalOrNull() ?: return a.trim() == b.trim()
    val y = b.trim().toBigDecimalOrNull() ?: return false
    return x.compareTo(y) == 0
}

/**
 * The body for `PATCH /transactions/{id}`: only what changed from [before], because the API changes only
 * the fields it is sent (so items, a card or a place the form does not show are left alone). Clearing a
 * vendor, a note or a time is an explicit null. An empty object means nothing changed.
 */
fun AddForm.patchJson(before: AddForm, accounts: List<Account>, baseCurrency: String): JsonObject = buildJsonObject {
    if (type != before.type) put("type", type)
    if (!sameNumber(amount, before.amount)) put("amount", amount.trim())
    if (date != before.date) put("transaction_date", date)
    if (time != before.time) { if (time == null) put("transaction_time", JsonNull) else put("transaction_time", "$time:00") }
    if (planned != before.planned) put("planned", planned)
    if (accountId != before.accountId) accountId?.let { put("account_id", it) }
    if (type == "transfer") {
        if (toAccountId != before.toAccountId) toAccountId?.let { put("to_account_id", it) }
        if (!sameNumber(toAmount, before.toAmount) && toAmount.isNotBlank()) put("to_amount", toAmount.trim())
    } else {
        if (category.trim() != before.category.trim()) put("category", category.trim())
        if (method != before.method) put("payment_method", method)
        if (tags != before.tags) put("tags", JsonArray(tags.map { JsonPrimitive(it) }))
        // a new account or a new rate carries its currency; the rate only matters away from the base currency
        if (accountId != before.accountId || !sameNumber(rate, before.rate)) {
            val currency = accounts.firstOrNull { it.id == accountId }?.currency ?: baseCurrency
            put("currency", currency)
            if (currency != baseCurrency) put("exchange_rate", rate.trim())
        }
    }
    if (vendor.trim() != before.vendor.trim()) { if (vendor.isBlank()) put("vendor_name", JsonNull) else put("vendor_name", vendor.trim()) }
    if (note.trim() != before.note.trim()) { if (note.isBlank()) put("description", JsonNull) else put("description", note.trim()) }
    // the spot goes as all three together: new values, or an explicit null each to remove it
    if (latitude != before.latitude || longitude != before.longitude || place.trim() != before.place.trim()) {
        if (latitude.isBlank() || longitude.isBlank()) { put("latitude", JsonNull); put("longitude", JsonNull); put("place", JsonNull) }
        else { put("latitude", latitude.trim()); put("longitude", longitude.trim()); if (place.isBlank()) put("place", JsonNull) else put("place", place.trim()) }
    }
}
