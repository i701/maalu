package app.maalu.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Templates: saved starting points for transactions you repeat. A template pre-fills whatever it has; the rate is deliberately not
// stored (the form takes the account's). Only the name can be changed later: to change what it fills in, delete it and save it again.

@Serializable
data class Template(
    val id: String,
    val name: String,
    val type: String,
    val amount: String? = null,
    val currency: String = "",
    @SerialName("payment_method") val paymentMethod: String = "other",
    val category: String? = null,
    val vendor: String? = null,
    val description: String? = null,
    val account: TemplateAccount? = null,
    @SerialName("to_account") val toAccount: TemplateAccount? = null,
    val tags: List<NameRef> = emptyList(),
)

@Serializable
data class TemplateAccount(val id: String, val name: String, val currency: String = "")

/**
 * The form a template starts: its type, amount, account(s), category, vendor, way of paying, tags and note. The date is today
 * (a template never carries one). An account that no longer exists is left to the form's default. [accounts] gives the rate.
 */
fun formFromTemplate(t: Template, accounts: List<Account>): AddForm {
    val from = t.account?.let { ref -> accounts.firstOrNull { it.id == ref.id } }
    return AddForm(
        type = t.type,
        amount = t.amount?.let { tidyAmountText(it) }.orEmpty(),
        accountId = from?.id,
        toAccountId = t.toAccount?.let { ref -> accounts.firstOrNull { it.id == ref.id }?.id },
        category = if (t.type == "transfer") "" else t.category.orEmpty(),
        vendor = if (t.type == "transfer") "" else t.vendor.orEmpty(),
        method = t.paymentMethod, methodTouched = true,
        rate = from?.let { tidyRate(it.exchangeRate) } ?: "1",
        tags = t.tags.map { it.name },
        note = t.description.orEmpty(),
    )
}

/** What is wrong with a template's name, or null. */
fun templateNameProblem(name: String): String? = when {
    name.isBlank() -> "Give it a name."
    name.trim().length > 200 -> "A name can have 200 characters at most."
    else -> null
}

/** The body for `POST /templates`: the form as it stands, with a name. Left-empty fields are left out so the template does not fill them. */
fun AddForm.toTemplateJson(name: String, accounts: List<Account>): JsonObject {
    val from = accounts.firstOrNull { it.id == accountId }
    val to = accounts.firstOrNull { it.id == toAccountId }
    return buildJsonObject {
        put("name", name.trim())
        put("type", type)
        if (isPositive(amount)) put("amount", amount.trim())
        put("payment_method", method)
        from?.let { put("account_id", it.id) }
        if (type == "transfer") {
            to?.let { put("to_account_id", it.id) }
        } else {
            category.trim().takeIf { it.isNotEmpty() }?.let { put("category", it) }
            vendor.trim().takeIf { it.isNotEmpty() }?.let { put("vendor_name", it) }
            if (tags.isNotEmpty()) put("tags", JsonArray(tags.map { JsonPrimitive(it) }))
        }
        note.trim().takeIf { it.isNotEmpty() }?.let { put("description", it) }
    }
}

/** The body for renaming (`PATCH /templates/{id}`). */
fun renameJson(name: String): JsonObject = buildJsonObject { put("name", name.trim()) }

/** What a template fills in, as one line: "Expense · MVR 250.00 · Groceries · BML Current". */
fun templateSummary(t: Template): String = buildList {
    add(t.type.replaceFirstChar { it.uppercase() })
    t.amount?.let { add(formatMoneyFull(it, t.currency.ifBlank { "" }).trim()) }
    if (t.type == "transfer") {
        if (t.account != null && t.toAccount != null) add("${t.account.name} → ${t.toAccount.name}")
    } else {
        t.category?.takeIf { it.isNotBlank() }?.let { add(it) }
        t.vendor?.takeIf { it.isNotBlank() }?.let { add(it) }
        t.account?.let { add(it.name) }
    }
}.joinToString(" · ")
