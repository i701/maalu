package app.maalu.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.math.BigDecimal

// Refunds: money given back for an earlier purchase. A refund is income that names the purchase (and, for a purchase with items, the items given
// back); it is in the purchase's currency and category and can be up to what is left of it. Ported from apps/web/src/lib/refund.ts.

/** The purchase a refund gives money back for, as a refund carries it. */
@Serializable
data class RefundOfRef(
    val id: String,
    val amount: String,
    val currency: String,
    val category: String = "",
    @SerialName("transaction_date") val date: String = "",
    @SerialName("vendor_name") val vendorName: String? = null,
)

/** The purchase this refund is for, or null when it is not a refund. */
fun Transaction.refundOfRef(): RefundOfRef? =
    refundOf?.takeIf { it !is JsonNull }?.let { runCatching { AppJson.decodeFromJsonElement(RefundOfRef.serializer(), it) }.getOrNull() }

private fun dec(s: String): BigDecimal = s.trim().toBigDecimalOrNull() ?: BigDecimal.ZERO

/** What is left to refund of a purchase, or of one of its items: its amount less what refunds so far gave back. */
fun amountLeft(amount: String, refunded: String): String = dec(amount).subtract(dec(refunded)).toPlainString()

/** Whether a purchase has anything left to refund. Planned ones have not happened yet. */
fun canRefund(t: Transaction): Boolean =
    t.type == "expense" && !t.planned && !t.adjustment && dec(amountLeft(t.amount, t.refundedAmount)).signum() > 0

/** Whether this is plain income that could be linked to the purchase it gave money back for. Pay (the Salary category) never is. */
fun canLinkRefund(t: Transaction): Boolean = t.type == "income" && !t.adjustment && !t.isRefund && !t.categoryIsSalary && !t.planned

/** Whether refunds have given part of this purchase back. */
fun wasRefunded(t: Transaction): Boolean = dec(t.refundedAmount).signum() > 0

/** One item of a purchase that a refund can give back. */
data class RefundItem(val id: String, val name: String, val category: String, val left: String, val amount: String, val on: Boolean)

/** The items a new refund can pick from: every item of the purchase, none ticked yet, each at what is left. */
fun itemsToPick(purchase: Transaction): List<RefundItem> = purchase.splits.map {
    val left = amountLeft(it.amount, it.refundedAmount)
    RefundItem(it.id, it.name, it.category, left, left, false)
}

/** The items an existing refund already gives back, with their amounts to change. */
fun itemsOfRefund(refund: Transaction): List<RefundItem> = refund.splits.map {
    RefundItem(it.refundOfSplitId ?: it.id, it.name, it.category, it.amount, it.amount, true)
}

/** What the ticked items add up to. */
fun itemsTotal(items: List<RefundItem>): BigDecimal = items.filter { it.on }.fold(BigDecimal.ZERO) { a, i -> a.add(dec(i.amount)) }

/** The ticked items as the lines the API wants: each names the item it gives back (and takes its category from it). */
fun refundLines(items: List<RefundItem>): JsonArray = buildJsonArray {
    items.filter { it.on }.forEach {
        add(buildJsonObject {
            put("name", it.name); put("quantity", "1"); put("category", it.category); put("amount", it.amount.trim()); put("refund_of_split_id", it.id)
        })
    }
}

/** A problem with a single refund amount (a purchase without items) against what is left, or null. [left] is null when it is not known (an edit). */
fun refundAmountProblem(text: String, left: String?): String? {
    val a = text.trim().toBigDecimalOrNull()
    if (a == null || a.signum() <= 0) return "Enter an amount above zero."
    if (left != null && a > dec(left)) return "That is more than is left to refund."
    return null
}

/** A problem with the ticked items, or null: at least one, each above zero and within what is left of it. */
fun itemsProblem(items: List<RefundItem>, locked: Boolean = false): String? {
    val ticked = items.filter { it.on }
    if (ticked.isEmpty()) return "Choose at least one item."
    for (i in ticked) {
        val a = i.amount.trim().toBigDecimalOrNull()
        if (a == null || a.signum() <= 0) return "Enter an amount above zero for ${i.name}."
        if (!locked && a > dec(i.left)) return "${i.name}: that is more than is left to refund."
    }
    return null
}

/** What the dialog says it is about: the purchase, what it cost and when. */
fun refundContext(purchase: Transaction?, refund: Transaction?): String {
    if (purchase != null) return "${purchase.title()} · ${formatMoney(purchase.amount, purchase.currency)} on ${shortDate(purchase.date)}"
    val of = refund?.refundOfRef() ?: return ""
    return "${of.vendorName ?: of.category} · ${formatMoney(of.amount, of.currency)} on ${if (of.date.isBlank()) "" else shortDate(of.date)}"
}

/**
 * The body for a new refund (`POST /transactions`) or for changing one (`PATCH`): the amount (the ticked items' total for a purchase with items),
 * the day and time, the rate when the currency is not the base one, an optional note and account.
 */
fun refundJson(
    purchaseId: String?, amount: String, date: String, time: String?, rate: String?, description: String, accountId: String?, items: List<RefundItem>?, editing: Boolean,
): JsonObject = buildJsonObject {
    if (!editing) { put("type", "income"); put("refund_of_id", purchaseId) }
    put("amount", amount.trim())
    put("transaction_date", date)
    if (time != null) put("transaction_time", time) else if (editing) put("transaction_time", JsonNull)
    if (rate != null) put("exchange_rate", rate.trim())
    if (items != null) put("splits", refundLines(items))
    val note = description.trim()
    if (note.isNotEmpty()) put("description", note) else if (editing) put("description", JsonNull)
    if (accountId != null) put("account_id", accountId) else if (editing) put("account_id", JsonNull)
}

/** The body that turns income you already recorded into a refund of [purchaseId] (with the items given back, for a purchase with items). */
fun linkRefundJson(purchaseId: String, items: List<RefundItem>?): JsonObject = buildJsonObject {
    put("refund_of_id", purchaseId)
    if (!items.isNullOrEmpty()) put("splits", refundLines(items))
}

/** "30 Nov · MVR 100.00 · MVR 40.00 left": the facts of a purchase to pick. */
fun candidateFacts(p: Transaction): String = "${shortDate(p.date)} · ${formatMoney(p.amount, p.currency)} · ${formatMoney(amountLeft(p.amount, p.refundedAmount), p.currency)} left"
