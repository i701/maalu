package app.maalu.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// The Trash: deleted transactions, kept until they are restored or deleted for good. Bulk actions report instead of failing.

@Serializable
data class Skipped(val id: String, val reason: String)

/** What a bulk action did: how many it changed and which ids it left alone, with why. */
@Serializable
data class BulkResult(val updated: Int = 0, val skipped: List<Skipped> = emptyList())

fun transactionCount(n: Int): String = "$n ${if (n == 1) "transaction" else "transactions"}"

/** "Restored 3 transactions", plus how many were left alone and why ("Restored 2 transactions. 1 skipped: …"). */
fun bulkMessage(done: (Int) -> String, result: BulkResult): String {
    val head = done(result.updated)
    if (result.skipped.isEmpty()) return head
    val reasons = result.skipped.map { it.reason }.distinct().joinToString("; ")
    return "$head. ${result.skipped.size} skipped: $reasons"
}

/** The API takes at most this many ids in one bulk request. */
const val BULK_LIMIT = 500

/** The body of a bulk request. */
fun idsJson(ids: List<String>): JsonObject = buildJsonObject { put("ids", JsonArray(ids.map { JsonPrimitive(it) })) }

/** Several batches' results as one. */
fun mergeBulk(results: List<BulkResult>): BulkResult = BulkResult(results.sumOf { it.updated }, results.flatMap { it.skipped })

/** The ids as requests of at most [BULK_LIMIT]. */
fun batches(ids: List<String>): List<List<String>> = ids.chunked(BULK_LIMIT)

/** What ticking [id] does to the current selection (a set kept in order of ticking is not needed: it is only ever counted). */
fun toggled(selected: Set<String>, id: String): Set<String> = if (id in selected) selected - id else selected + id

/** The selection after rows are gone (restored or deleted) or the list changed: only ids still on screen stay. */
fun keepVisible(selected: Set<String>, visible: List<String>): Set<String> = selected.intersect(visible.toSet())

/** The most the API will select across pages at once (`GET /transactions/ids` refuses past it). */
const val MAX_SELECT_ALL = 5000

/** What to change on every selected transaction; whatever is empty is left as it is. */
data class BulkEdit(
    val category: String = "",
    val vendor: String = "",
    val method: String? = null,
    val addTags: List<String> = emptyList(),
    val removeTags: List<String> = emptyList(),
) {
    val isEmpty: Boolean get() = category.isBlank() && vendor.isBlank() && method == null && addTags.isEmpty() && removeTags.isEmpty()
}

/** The body of `PATCH /transactions/bulk`: the ids and only what was chosen (the server skips what does not fit a transaction and says so). */
fun bulkEditJson(ids: List<String>, e: BulkEdit): JsonObject = buildJsonObject {
    put("ids", JsonArray(ids.map { JsonPrimitive(it) }))
    e.category.trim().takeIf { it.isNotEmpty() }?.let { put("category", it) }
    e.vendor.trim().takeIf { it.isNotEmpty() }?.let { put("vendor_name", it) }
    e.method?.let { put("payment_method", it) }
    if (e.addTags.isNotEmpty()) put("add_tags", JsonArray(e.addTags.map { JsonPrimitive(it) }))
    if (e.removeTags.isNotEmpty()) put("remove_tags", JsonArray(e.removeTags.map { JsonPrimitive(it) }))
}

/** What the selection bar says about selecting everything that matches the filters, across pages. */
sealed interface SelectAll {
    /** Nothing to offer: not everything loaded is ticked, or everything that matches is already loaded. */
    data object None : SelectAll
    data class Offer(val total: Int) : SelectAll
    /** More match than the API will select at once. */
    data class TooMany(val total: Int) : SelectAll
    /** Everything that matches is selected. */
    data class Wide(val total: Int) : SelectAll
}

/** [total] rows match the filters, [loaded] are on screen, [picked] are selected; [wide] means the selection already reaches past what is loaded. */
fun selectAllState(total: Int, loaded: Int, picked: Int, wide: Boolean): SelectAll = when {
    wide -> SelectAll.Wide(total)
    picked < loaded || total <= loaded -> SelectAll.None
    total > MAX_SELECT_ALL -> SelectAll.TooMany(total)
    else -> SelectAll.Offer(total)
}
