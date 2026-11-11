package app.maalu.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

// Groups bundle a handful of related transactions under a name (a trip, instalments) and show what they add up to. A group changes
// nothing else: the transactions keep their category, tags and amounts. A transaction is in at most one group, and a group holds
// 2 to 50.

const val MIN_GROUP = 2
const val MAX_GROUP = 50

@Serializable
data class Group(
    val id: String,
    val name: String,
    val note: String? = null,
    @SerialName("transaction_count") val transactionCount: Int = 0,
    @SerialName("date_from") val dateFrom: String? = null,
    @SerialName("date_to") val dateTo: String? = null,
    @SerialName("money_in") val moneyIn: String = "0",
    @SerialName("money_out") val moneyOut: String = "0",
    val net: String = "0",
    val currency: String = "",
)

@Serializable
data class GroupDetail(
    val id: String,
    val name: String,
    val note: String? = null,
    @SerialName("transaction_count") val transactionCount: Int = 0,
    @SerialName("date_from") val dateFrom: String? = null,
    @SerialName("date_to") val dateTo: String? = null,
    @SerialName("money_in") val moneyIn: String = "0",
    @SerialName("money_out") val moneyOut: String = "0",
    val net: String = "0",
    val currency: String = "",
    val transactions: List<Transaction> = emptyList(),
)

@Serializable
data class GroupRemoved(val removed: Int = 0, val dissolved: Boolean = false)

/** Why this many transactions can't make a new group, or null when they can. */
fun groupSizeProblem(count: Int): String? = when {
    count < MIN_GROUP -> "Choose at least $MIN_GROUP transactions to make a group."
    count > MAX_GROUP -> "A group holds at most $MAX_GROUP transactions."
    else -> null
}

private val Day = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH)
private fun day(iso: String): String = runCatching { LocalDate.parse(iso).format(Day) }.getOrDefault(iso)

/** "1 Mar 2026" for one day, "1 Mar 2026 – 9 Mar 2026" for a span, "" for none. */
fun dateSpan(from: String?, to: String?): String = when {
    from == null || to == null -> ""
    from == to -> day(from)
    else -> "${day(from)} – ${day(to)}"
}

private fun plural(n: Int, one: String, many: String) = "$n ${if (n == 1) one else many}"

/** "3 transactions · 1 Mar 2026 – 9 Mar 2026". */
fun groupLine(count: Int, from: String?, to: String?): String =
    listOf(plural(count, "transaction", "transactions"), dateSpan(from, to)).filter { it.isNotEmpty() }.joinToString(" · ")

fun groupedMessage(count: Int, name: String, created: Boolean): String =
    if (created) "Made \"$name\" from ${plural(count, "transaction", "transactions")}." else "Added ${plural(count, "transaction", "transactions")} to \"$name\"."

/** What a group's net says: money in less money out, so a trip that cost more than it brought back is negative. */
fun isNegative(value: String): Boolean = value.toBigDecimalOrNull()?.signum()?.let { it < 0 } == true

/** What can be put in a group: not a transfer, not a balance adjustment, and not already in one. */
fun canGroup(t: Transaction): Boolean = t.type != "transfer" && !t.adjustment && t.group == null

/** Why a transaction can't be picked, or null when it can. */
fun cannotGroupReason(t: Transaction): String? = when {
    t.type == "transfer" -> "A transfer can't be grouped"
    t.adjustment -> "A balance adjustment can't be grouped"
    t.group != null -> "Already in ${t.group.name}"
    else -> null
}

/** The body for `POST /groups`. */
fun createGroupJson(name: String, note: String, ids: List<String>): JsonObject = buildJsonObject {
    put("name", name.trim())
    note.trim().takeIf { it.isNotEmpty() }?.let { put("note", it) }
    put("transaction_ids", JsonArray(ids.map { JsonPrimitive(it) }))
}

/** The body for adding to or removing from a group. */
fun memberJson(ids: List<String>): JsonObject = buildJsonObject { put("transaction_ids", JsonArray(ids.map { JsonPrimitive(it) })) }

/** The body for renaming and editing the note: an explicit null clears the note. */
fun updateGroupJson(name: String, note: String): JsonObject = buildJsonObject {
    put("name", name.trim())
    put("note", note.trim().takeIf { it.isNotEmpty() }?.let { JsonPrimitive(it) } ?: JsonNull)
}

fun groupNameProblem(name: String): String? = when {
    name.isBlank() -> "Give the group a name."
    name.trim().length > 100 -> "A name can have 100 characters at most."
    else -> null
}

/** What removing members left: "Removed 2 from Trip." or, when too few remained, that the group is gone. */
fun removedMessage(r: GroupRemoved, name: String): String =
    if (r.dissolved) "Removed ${plural(r.removed, "transaction", "transactions")}. \"$name\" needs two, so it was deleted."
    else "Removed ${plural(r.removed, "transaction", "transactions")} from \"$name\"."
