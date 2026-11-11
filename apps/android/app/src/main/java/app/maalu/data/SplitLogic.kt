package app.maalu.data

import java.math.BigDecimal
import java.math.RoundingMode
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// A purchase split into items: each with a quantity, a price and its own category. The line totals add up to the transaction's amount and its own
// category becomes the biggest item's. Prices can come with GST included or excluded. (A port of the web's lib/splits.ts.)

/** One item of a saved split transaction, as the API returns it. */
@Serializable
data class PurchaseItem(
    val id: String = "",
    val name: String,
    val quantity: String = "1",
    val category: String = "",
    val amount: String,
    @SerialName("tax_amount") val taxAmount: String? = null,
)

/** How prices on a receipt relate to GST. */
enum class TaxMode(val label: String) { None("No GST"), Included("Prices include GST"), Excluded("Prices exclude GST") }

/**
 * One row of the items table, as typed. A row from a saved transaction keeps its exact line total and tax ([lockedAmount], [lockedTax]) until
 * its quantity or price is edited.
 */
data class ItemRow(
    val key: String,
    val name: String = "",
    val quantity: String = "1",
    /** The price of one unit, as typed. */
    val price: String = "",
    val category: String = "",
    val lockedAmount: String? = null,
    val lockedTax: String? = null,
)

private var counter = 0
fun newItem(): ItemRow = ItemRow("item-${counter++}")

/** A line's total (tax included) and the tax in it. */
data class LineAmount(val amount: BigDecimal, val tax: BigDecimal?)

private val HUNDRED = BigDecimal(100)

private fun scaled(text: String, scale: Int): BigDecimal? = text.trim().toBigDecimalOrNull()?.takeIf { it.signum() >= 0 }?.setScale(scale, RoundingMode.HALF_UP)

/** The line total (tax included) and the tax in it, or null while quantity or price is incomplete. */
fun lineAmount(row: ItemRow, mode: TaxMode, rate: String): LineAmount? {
    row.lockedAmount?.let { a -> return LineAmount(a.toBigDecimalOrNull() ?: return null, row.lockedTax?.toBigDecimalOrNull()) }
    val qty = scaled(row.quantity, 3) ?: return null
    val price = scaled(row.price, 4) ?: return null
    if (qty.signum() == 0 || price.signum() == 0) return null
    val base = (qty * price).setScale(4, RoundingMode.HALF_UP)
    val pct = if (mode == TaxMode.None) BigDecimal.ZERO else scaled(rate, 4) ?: return null
    if (pct.signum() == 0) return LineAmount(base, null)
    return when (mode) {
        TaxMode.Included -> LineAmount(base, (base * pct).divide(HUNDRED + pct, 4, RoundingMode.HALF_UP))
        else -> { val tax = (base * pct).divide(HUNDRED, 4, RoundingMode.HALF_UP); LineAmount(base + tax, tax) }
    }
}

/** The sum of the complete lines' totals. */
fun splitTotal(lines: List<LineAmount?>): BigDecimal = lines.fold(BigDecimal.ZERO) { a, l -> if (l == null) a else a + l.amount }

/** Rows for a saved split transaction: totals are kept exactly; the unit price is shown for reference. */
fun rowsFromSplits(items: List<PurchaseItem>): List<ItemRow> = items.map { s ->
    val qty = s.quantity.toBigDecimalOrNull()
    val amount = s.amount.toBigDecimalOrNull()
    val unit = if (qty != null && qty.signum() > 0 && amount != null) amount.divide(qty, 4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString() else s.amount
    ItemRow(
        key = newItem().key, name = s.name, quantity = qty?.stripTrailingZeros()?.toPlainString() ?: "1", price = unit,
        category = s.category, lockedAmount = s.amount, lockedTax = s.taxAmount,
    )
}

/** The lines of the form's items, in order, each null while incomplete. */
fun AddForm.lines(): List<LineAmount?> = items.map { lineAmount(it, taxMode, taxRate) }

/** What the transaction's amount is: the typed one, or with items the total of their lines. */
fun AddForm.effectiveAmount(): String = if (splitOn && type != "transfer") splitTotal(lines()).toPlainString() else amount

/** The first thing wrong with the items, in words, or null. */
fun AddForm.itemsProblem(): String? {
    if (items.isEmpty()) return "Add at least one item."
    if (taxMode != TaxMode.None && !(taxRate.trim().toBigDecimalOrNull()?.signum() == 1)) return "Enter the GST rate, for example 8."
    val lines = lines()
    items.forEachIndexed { i, row ->
        val label = row.name.trim().ifEmpty { "Item ${i + 1}" }
        if (row.name.isBlank()) return "Item ${i + 1} needs a name."
        if (row.category.isBlank()) return "$label needs a category."
        if (lines[i] == null) return "$label needs a quantity and a price."
    }
    if (splitTotal(lines).signum() <= 0) return "The items add up to nothing."
    return null
}

/** The items as the API wants them: name, quantity, category, the line total and the tax in it. */
fun AddForm.splitsJson(): JsonArray {
    val lines = lines()
    return JsonArray(items.mapIndexed { i, row ->
        buildJsonObject {
            put("name", row.name.trim()); put("quantity", row.quantity.trim()); put("category", row.category.trim())
            put("amount", lines[i]!!.amount.toPlainString())
            val tax = lines[i]!!.tax
            if (tax != null) put("tax_amount", tax.toPlainString()) else put("tax_amount", JsonNull)
        }
    })
}

/** "Rice 2 × 15.00 = 30.00" style line for the detail sheet. */
fun PurchaseItem.summary(currency: String): String {
    val qty = quantity.toBigDecimalOrNull()?.stripTrailingZeros()?.toPlainString() ?: quantity
    return (if (qty == "1") name else "$name × $qty") + " · " + formatMoney(amount, currency)
}
