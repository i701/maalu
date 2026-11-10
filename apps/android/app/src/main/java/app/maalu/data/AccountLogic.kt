package app.maalu.data

import java.math.BigDecimal
import java.math.RoundingMode
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Ported from apps/web/src/lib/accounts.ts and the API's enums: keep them in step.

val AccountGroupsInOrder = listOf("cash", "accounts", "card", "savings", "prepaid", "investments", "overdrafts", "loan", "insurance", "others")
val CreditLimitGroups = setOf("card", "overdrafts")
val LiabilityGroups = setOf("card", "overdrafts", "loan")
private val SpendableByDefault = setOf("cash", "accounts", "prepaid")

/** What each group means, shown when one is chosen. */
val GroupHelp = mapOf(
    "cash" to "Money you hold as notes and coins: a wallet, a drawer, a safe.",
    "accounts" to "A bank account you keep money in and pay from. Its debit card is part of it: spend with the card and the money comes out of this account.",
    "card" to "A credit card: you spend the bank's money and pay it back later, so the balance is what you owe. Set a credit limit to see how much is used.",
    "savings" to "A bank savings account, or money you keep apart on purpose. Goals can follow its balance.",
    "prepaid" to "A top-up balance you spend down: phone credit, a transport card, a gift card.",
    "investments" to "Money invested in shares, funds or a business, whose value you track here.",
    "overdrafts" to "An overdraft on a bank account: money you owe the bank, up to a limit.",
    "loan" to "Money you owe and pay back in instalments, like a car or personal loan.",
    "insurance" to "A policy with a cash value, or a premium balance you keep.",
    "others" to "Anything that holds money and does not fit the rest.",
)

/** Whether an account of this group counts as everyday money when the person has not chosen. */
fun spendableByGroup(group: String): Boolean = group in SpendableByDefault

val BankSuggestions = listOf("BML", "MIB", "SBI", "HDFC", "Ooredoo m-Faisa", "Dhiraagu Pay")

/** The banks to offer: those already on your accounts first, then the usual ones. */
fun bankChoices(accounts: List<Account>): List<String> {
    val used = accounts.mapNotNull { it.bank?.takeIf(String::isNotBlank) }.distinct()
    val known = used.map { it.lowercase() }.toSet()
    return used + BankSuggestions.filter { it.lowercase() !in known }
}

data class CreditUsage(val owed: BigDecimal, val limit: BigDecimal, val percent: Int)

/** What is owed against a card's limit, or null when it has none. */
fun creditUsage(balance: String, limit: String?): CreditUsage? {
    val lim = limit?.toBigDecimalOrNull()?.takeIf { it.signum() > 0 } ?: return null
    val bal = balance.toBigDecimalOrNull() ?: return null
    val owed = if (bal.signum() < 0) bal.abs() else BigDecimal.ZERO
    return CreditUsage(owed, lim, owed.multiply(BigDecimal(100)).divide(lim, 0, RoundingMode.HALF_UP).toInt())
}

/** `-`, digits and one dot: what the opening-amount field accepts (a card can open with a negative balance). */
fun cleanSigned(input: String): String {
    val negative = input.startsWith("-")
    return (if (negative) "-" else "") + cleanAmount(input.removePrefix("-"))
}

/** Both statement and due day, or neither (port of statementDays): 1 to 31. */
fun statementDaysProblem(statement: String, due: String): String? {
    val a = statement.trim(); val b = due.trim()
    if (a.isEmpty() && b.isEmpty()) return null
    if (a.isEmpty() || b.isEmpty()) return "Give both the day the statement closes and the day it is due."
    val days = listOf(a, b).map { v -> v.takeIf { it.all(Char::isDigit) && it.length <= 2 }?.toInt() }
    return if (days.any { it == null || it !in 1..31 }) "Days are whole numbers from 1 to 31." else null
}

enum class AccountField { Name, Currency, Rate, Opening, CreditLimit, Days }

data class AccountProblem(val field: AccountField, val message: String)

/** What the account form holds. */
data class AccountForm(
    val group: String = "accounts",
    val name: String = "",
    val currency: String = "",
    val rate: String = "1",
    val rateTouched: Boolean = false,
    val autoRate: Boolean = false,
    val opening: String = "0",
    val bank: String = "",
    val number: String = "",
    val description: String = "",
    val creditLimit: String = "",
    val statementDay: String = "",
    val dueDay: String = "",
    val exclude: Boolean = false,
    /** null follows the group. */
    val spendable: Boolean? = null,
)

fun AccountForm.problem(baseCurrency: String): AccountProblem? {
    if (name.isBlank()) return AccountProblem(AccountField.Name, "Give the account a name.")
    if (currency.isNotBlank() && currency != baseCurrency && !isPositive(rate)) return AccountProblem(AccountField.Rate, "Enter the exchange rate.")
    if (opening.isNotBlank() && opening.trim().toBigDecimalOrNull() == null) return AccountProblem(AccountField.Opening, "The opening amount must be a number.")
    if (group in CreditLimitGroups && creditLimit.isNotBlank() && creditLimit.trim().toBigDecimalOrNull()?.let { it.signum() >= 0 } != true) {
        return AccountProblem(AccountField.CreditLimit, "The credit limit must be zero or more.")
    }
    if (group == "card") statementDaysProblem(statementDay, dueDay)?.let { return AccountProblem(AccountField.Days, it) }
    return null
}

private fun AccountForm.foreign(base: String) = currency.isNotBlank() && currency != base
private fun AccountForm.liability() = group in LiabilityGroups

/** The body for `POST /accounts`. Blank optional fields are left out. */
fun AccountForm.toJson(baseCurrency: String): JsonObject = buildJsonObject {
    put("group", group)
    put("name", name.trim())
    if (currency.isNotBlank()) put("currency", currency)
    if (foreign(baseCurrency)) { put("exchange_rate", rate.trim()); if (autoRate) put("auto_rate", true) }
    put("opening_amount", opening.trim().ifEmpty { "0" })
    bank.trim().takeIf { it.isNotEmpty() }?.let { put("bank", it) }
    number.trim().takeIf { it.isNotEmpty() }?.let { put("account_number", it) }
    description.trim().takeIf { it.isNotEmpty() }?.let { put("description", it) }
    if (group in CreditLimitGroups) creditLimit.trim().takeIf { it.isNotEmpty() }?.let { put("credit_limit", it) }
    if (group == "card" && statementDay.isNotBlank()) { put("statement_day", statementDay.trim().toInt()); put("due_day", dueDay.trim().toInt()) }
    if (exclude) put("exclude_from_stats", true)
    if (!liability() && spendable != null && spendable != spendableByGroup(group)) put("spendable", spendable)
}

fun formFrom(a: Account): AccountForm = AccountForm(
    group = a.group, name = a.name, currency = a.currency, rate = tidyRate(a.exchangeRate), rateTouched = true, autoRate = a.autoRate,
    opening = tidyAmount(a.openingAmount), bank = a.bank.orEmpty(), number = a.accountNumber.orEmpty(), description = a.description.orEmpty(),
    creditLimit = a.creditLimit?.let(::tidyAmount).orEmpty(), statementDay = a.statementDay?.toString().orEmpty(), dueDay = a.dueDay?.toString().orEmpty(),
    exclude = a.excludeFromStats, spendable = a.spendable,
)

private fun same(a: String, b: String): Boolean {
    val x = a.trim().toBigDecimalOrNull() ?: return a.trim() == b.trim()
    val y = b.trim().toBigDecimalOrNull() ?: return false
    return x.compareTo(y) == 0
}

/** The body for `PATCH /accounts/{id}`: only what changed from [before]; clearing a text field is an explicit null. */
fun AccountForm.patchJson(before: AccountForm, baseCurrency: String): JsonObject = buildJsonObject {
    fun text(key: String, now: String, was: String) {
        if (now.trim() != was.trim()) { if (now.isBlank()) put(key, JsonNull) else put(key, now.trim()) }
    }
    if (group != before.group) put("group", group)
    if (name.trim() != before.name.trim()) put("name", name.trim())
    if (currency != before.currency) put("currency", currency)
    if (foreign(baseCurrency) && (currency != before.currency || !same(rate, before.rate))) put("exchange_rate", rate.trim())
    if (foreign(baseCurrency) && autoRate != before.autoRate) put("auto_rate", autoRate)
    if (!same(opening.ifBlank { "0" }, before.opening.ifBlank { "0" })) put("opening_amount", opening.trim().ifEmpty { "0" })
    text("bank", bank, before.bank)
    text("account_number", number, before.number)
    text("description", description, before.description)
    if (group in CreditLimitGroups && !same(creditLimit, before.creditLimit)) { if (creditLimit.isBlank()) put("credit_limit", JsonNull) else put("credit_limit", creditLimit.trim()) }
    if (group == "card" && (statementDay.trim() != before.statementDay.trim() || dueDay.trim() != before.dueDay.trim())) {
        if (statementDay.isBlank()) put("statement_day", JsonNull) else { put("statement_day", statementDay.trim().toInt()); put("due_day", dueDay.trim().toInt()) }
    }
    if (exclude != before.exclude) put("exclude_from_stats", exclude)
    if (spendable != before.spendable) { if (spendable == null) put("spendable", JsonNull) else put("spendable", spendable) }
}
