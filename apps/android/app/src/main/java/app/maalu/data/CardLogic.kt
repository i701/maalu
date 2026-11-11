package app.maalu.data

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Cards: an account holds money, a card only spends from one. A debit card spends from a bank account (no balance of its own); a credit
// card is its own account (the "card" group, what you owe) and may name the bank account that repays it. Only the last four digits are kept.

/** Groups that hold a debt: a debit card cannot spend from them, and nothing is repaid from them. */
private val DEBT_GROUPS = setOf("card", "overdrafts", "loan")

/** "MIB Visa debit ••2815", or just the name when no digits were given. */
fun cardText(name: String, lastDigits: String?): String = if (lastDigits.isNullOrBlank()) name else "$name ••$lastDigits"
fun Card.text(): String = cardText(name, lastDigits)
fun CardRef.text(): String = cardText(name, lastDigits)

/** How a purchase with this kind of card is paid. */
fun cardMethod(kind: String): String = if (kind == "credit") "credit_card" else "debit_card"

/** Whether an account of this group can have cards: money you spend, or a credit card; a loan or overdraft cannot. */
fun canHaveCards(group: String): Boolean = group != "loan" && group != "overdrafts"

/** The accounts a credit card can be repaid from: any that is not a debt, other than the card's own account, and not archived. */
fun repayChoices(accounts: List<Account>, cardAccountId: String): List<Account> =
    accounts.filter { it.id != cardAccountId && it.group !in DEBT_GROUPS }

/** The cards on an account's page: the ones tied to it, and the credit cards repaid from it. */
data class CardsOf(val own: List<Card>, val repaid: List<Card>)
fun cardsOf(cards: List<Card>, accountId: String): CardsOf = CardsOf(
    own = cards.filter { it.account.id == accountId },
    repaid = cards.filter { it.repayAccount?.id == accountId },
)

/** What is wrong with a card's name or digits, or null. */
fun cardNameProblem(name: String): String? = when {
    name.isBlank() -> "Give the card a name."
    name.trim().length > 100 -> "A name can have 100 characters at most."
    else -> null
}
fun cardDigitsProblem(digits: String): String? = if (digits.isBlank() || Regex("^\\d{4}$").matches(digits.trim())) null else "Type the last 4 digits only, or leave it empty."

/** The body for `POST /cards`: the account decides the kind (a credit card account's card is a credit card). */
fun cardCreateJson(account: Account, name: String, digits: String, repayId: String?): JsonObject = buildJsonObject {
    val credit = account.group == "card"
    put("name", name.trim()); put("kind", if (credit) "credit" else "debit")
    digits.trim().takeIf { it.isNotEmpty() }?.let { put("last_digits", it) }
    put("account_id", account.id)
    if (credit && repayId != null) put("repay_account_id", repayId)
}

/** The body for `PATCH /cards/{id}`: name and digits (empty clears them), and for a credit card where it is repaid from. */
fun cardUpdateJson(credit: Boolean, name: String, digits: String, repayId: String?): JsonObject = buildJsonObject {
    put("name", name.trim())
    if (digits.isBlank()) put("last_digits", JsonNull) else put("last_digits", digits.trim())
    if (credit) { if (repayId == null) put("repay_account_id", JsonNull) else put("repay_account_id", repayId) }
}

/** The cards the form offers: those on the chosen account, or every card while none is chosen. */
fun cardsForForm(cards: List<Card>, accountId: String?): List<Card> = if (accountId == null) cards else cards.filter { it.account.id == accountId }

/** Picking a card on a purchase: it takes the card's account (with its rate) and the way of paying that kind of card uses. */
fun AddForm.withCard(card: Card, accounts: List<Account>): AddForm {
    val a = accounts.firstOrNull { it.id == card.account.id }
    return copy(cardId = card.id, accountId = card.account.id, rate = a?.let { tidyRate(it.exchangeRate) } ?: rate, method = cardMethod(card.kind), methodTouched = true)
}

/** Paying a credit card off: a transfer from the account it is repaid from into the card's own account, for [amount]. Null when it has no repayment account. */
fun repaymentForm(card: Card, amount: String = ""): AddForm? {
    val from = card.repayAccount ?: return null
    if (card.kind != "credit") return null
    return AddForm(type = "transfer", amount = if (amount.isBlank()) "" else tidyAmount(amount), accountId = from.id, toAccountId = card.account.id, note = "${card.name} repayment")
}
