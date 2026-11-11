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

/** The body of `PATCH /transactions/bulk` that sets the category of the chosen transactions (the server skips what cannot take one). */
fun categoryBulkJson(ids: List<String>, category: String): JsonObject = buildJsonObject {
    put("ids", JsonArray(ids.map { JsonPrimitive(it) })); put("category", category.trim())
}

/** The same, adding one tag to each. */
fun tagBulkJson(ids: List<String>, tag: String): JsonObject = buildJsonObject {
    put("ids", JsonArray(ids.map { JsonPrimitive(it) })); put("add_tags", JsonArray(listOf(JsonPrimitive(tag.trim()))))
}
