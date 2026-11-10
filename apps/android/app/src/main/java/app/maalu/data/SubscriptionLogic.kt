package app.maalu.data

import java.math.BigDecimal
import java.time.LocalDate
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Ported from apps/web/src/lib/subscription.ts and subscription-candidates.ts: keep them in step.

val IntervalUnits = listOf("week" to "Weeks", "month" to "Months", "year" to "Years")
val SubscriptionStatuses = listOf("active" to "Active", "paused" to "Paused", "cancelled" to "Cancelled")

/** Days before a payment to be reminded: null is never, 0 the day itself. */
val RemindOptions: List<Pair<Int?, String>> = listOf(
    null to "Never", 0 to "On the day", 1 to "1 day before", 2 to "2 days before", 3 to "3 days before",
    5 to "5 days before", 7 to "A week before", 14 to "2 weeks before", 30 to "A month before",
)

/** "every month", "every 3 months", "every week": how often it repeats, in words. */
fun everyText(unit: String, count: Int): String {
    val (one, many) = when (unit) { "week" -> "week" to "weeks"; "year" -> "year" to "years"; else -> "month" to "months" }
    return if (count == 1) "every $one" else "every $count $many"
}

/** "3 of 12 paid" for a plan with a fixed number of payments, null for an ongoing one. */
fun installmentsText(total: Int?, made: Int): String? = total?.let { "${minOf(made, it)} of $it paid" }

fun subscriptionStatusLabel(status: String): String = when (status) {
    "active" -> "Active"; "paused" -> "Paused"; "cancelled" -> "Cancelled"; "completed" -> "Completed"; else -> status
}

/** The line under a subscription's name: how often, then when it is next due (or that it is done). */
fun Subscription.dueText(): String {
    val every = everyText(intervalUnit, intervalCount)
    val parts = mutableListOf(every)
    when {
        status == "completed" -> parts += "all paid"
        status == "cancelled" -> parts += "cancelled"
        status == "paused" -> parts += "paused"
        nextDueDate != null -> parts += (if (isOverdue) "overdue since " else "next ") + shortDate(nextDueDate)
    }
    installmentsText(installmentsTotal, paymentsMade)?.let { parts += it }
    return parts.joinToString(" · ")
}

/** A varying bill is "about", a steady one is exact. */
fun amountPrefix(varies: Boolean) = if (varies) "about " else ""

// ---- the form ----

data class SubscriptionForm(
    val name: String = "",
    val amount: String = "",
    val accountId: String? = null,
    val rate: String = "1",
    val vendor: String = "",
    val category: String = "",
    val method: String = "bank_transfer",
    val unit: String = "month",
    val count: String = "1",
    val startDate: String = LocalDate.now().toString(),
    val status: String = "active",
    /** Blank: no end. */
    val installments: String = "",
    val remind: Int? = 3,
    val varies: Boolean = false,
)

enum class SubField { Name, Amount, Category, Count, Installments, Rate }
data class SubProblem(val field: SubField, val message: String)

fun SubscriptionForm.problem(accounts: List<Account>, baseCurrency: String): SubProblem? {
    if (name.isBlank()) return SubProblem(SubField.Name, "Give the subscription a name.")
    if (!isPositive(amount)) return SubProblem(SubField.Amount, "Enter an amount above zero.")
    if (category.isBlank()) return SubProblem(SubField.Category, "Choose a category.")
    if (count.trim().toIntOrNull()?.let { it >= 1 } != true) return SubProblem(SubField.Count, "How often must be a whole number, 1 or more.")
    if (installments.isNotBlank() && installments.trim().toIntOrNull()?.let { it in 1..600 } != true) return SubProblem(SubField.Installments, "The number of payments is a whole number from 1 to 600.")
    val currency = accounts.firstOrNull { it.id == accountId }?.currency ?: baseCurrency
    if (currency != baseCurrency && !isPositive(rate)) return SubProblem(SubField.Rate, "Enter the exchange rate.")
    return null
}

private fun currencyOf(f: SubscriptionForm, accounts: List<Account>, base: String) = accounts.firstOrNull { it.id == f.accountId }?.currency ?: base

fun SubscriptionForm.toJson(accounts: List<Account>, baseCurrency: String): JsonObject = buildJsonObject {
    put("name", name.trim())
    put("amount", amount.trim())
    put("category", category.trim())
    put("payment_method", method)
    put("interval_unit", unit)
    put("interval_count", count.trim().toInt())
    put("start_date", startDate)
    put("status", status)
    accountId?.let { put("account_id", it) }
    val currency = currencyOf(this@toJson, accounts, baseCurrency)
    if (currency != baseCurrency) { put("currency", currency); put("exchange_rate", rate.trim()) }
    vendor.trim().takeIf { it.isNotEmpty() }?.let { put("vendor_name", it) }
    installments.trim().takeIf { it.isNotEmpty() }?.let { put("installments_total", it.toInt()) }
    if (remind == null) put("remind_days_before", JsonNull) else put("remind_days_before", remind)
    if (varies) put("amount_varies", true)
}

fun subscriptionFormFrom(s: Subscription): SubscriptionForm = SubscriptionForm(
    name = s.name, amount = tidyAmount(s.amount), accountId = s.account?.id, rate = tidyRate(s.exchangeRate), vendor = s.vendor?.name.orEmpty(),
    category = s.category, method = s.paymentMethod, unit = s.intervalUnit, count = s.intervalCount.toString(), startDate = s.startDate,
    status = if (s.status == "completed") "active" else s.status, installments = s.installmentsTotal?.toString().orEmpty(),
    remind = s.remindDaysBefore, varies = s.amountVaries,
)

private fun same(a: String, b: String): Boolean {
    val x = a.trim().toBigDecimalOrNull() ?: return a.trim() == b.trim()
    val y = b.trim().toBigDecimalOrNull() ?: return false
    return x.compareTo(y) == 0
}

/** Only what changed from [before]; an ended plan, no vendor or no reminder is an explicit null. */
fun SubscriptionForm.patchJson(before: SubscriptionForm, accounts: List<Account>, baseCurrency: String): JsonObject = buildJsonObject {
    if (name.trim() != before.name.trim()) put("name", name.trim())
    if (!same(amount, before.amount)) put("amount", amount.trim())
    if (category.trim() != before.category.trim()) put("category", category.trim())
    if (method != before.method) put("payment_method", method)
    if (unit != before.unit) put("interval_unit", unit)
    if (count.trim() != before.count.trim()) put("interval_count", count.trim().toInt())
    if (startDate != before.startDate) put("start_date", startDate)
    if (status != before.status) put("status", status)
    if (accountId != before.accountId) { if (accountId == null) put("account_id", JsonNull) else put("account_id", accountId) }
    if (accountId != before.accountId || !same(rate, before.rate)) {
        val currency = currencyOf(this@patchJson, accounts, baseCurrency)
        put("currency", currency)
        if (currency != baseCurrency) put("exchange_rate", rate.trim())
    }
    if (vendor.trim() != before.vendor.trim()) { if (vendor.isBlank()) put("vendor_name", JsonNull) else put("vendor_name", vendor.trim()) }
    if (installments.trim() != before.installments.trim()) { if (installments.isBlank()) put("installments_total", JsonNull) else put("installments_total", installments.trim().toInt()) }
    if (remind != before.remind) { if (remind == null) put("remind_days_before", JsonNull) else put("remind_days_before", remind) }
    if (varies != before.varies) put("amount_varies", varies)
}

/** The body for accepting a suggestion, with whatever the person changed in the dialog. */
fun acceptJson(c: SubscriptionCandidate, name: String, amount: String, count: String, unit: String): JsonObject = buildJsonObject {
    put("vendor_id", c.vendorId)
    put("currency", c.currency)
    name.trim().takeIf { it.isNotEmpty() && it != c.vendorName }?.let { put("name", it) }
    if (!same(amount, c.amount) && isPositive(amount)) put("amount", amount.trim())
    count.trim().toIntOrNull()?.takeIf { it >= 1 && it != c.intervalCount }?.let { put("interval_count", it) }
    if (unit != c.intervalUnit) put("interval_unit", unit)
}

/** The key a suggestion is dismissed by: a vendor can be charged in two currencies. */
fun dismissJson(c: SubscriptionCandidate): JsonObject = buildJsonObject { put("vendor_id", c.vendorId); put("currency", c.currency) }

fun confidenceText(c: SubscriptionCandidate): String = if (c.confidence == "high") "Looks regular" else "Looser fit"

/** Whether a subscription can be paused: only an ongoing one (not a finished or cancelled plan). */
fun Subscription.canPause(): Boolean = status == "active"
fun Subscription.canResume(): Boolean = status == "paused" || status == "cancelled"

val BigDecimal.isZero: Boolean get() = signum() == 0
