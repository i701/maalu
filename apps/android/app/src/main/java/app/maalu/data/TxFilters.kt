package app.maalu.data

import java.time.LocalDate
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString

/** A chosen account, category or tag: the id to send and the name to show on its chip. */
@Serializable
data class Ref(val id: String, val name: String)

/**
 * Everything the Transactions list can be narrowed by (the web's filter drawer). `type` and `planned`
 * are the quick chips under the search; the rest live in the Filters sheet.
 */
@Serializable
data class TxFilters(
    val type: String? = null,
    val planned: Boolean = false,
    val dateFrom: String? = null,
    val dateTo: String? = null,
    val account: Ref? = null,
    val card: Ref? = null,
    val category: Ref? = null,
    val tags: List<Ref> = emptyList(),
    val tagMatch: String = "any",
    val method: String? = null,
    val kind: String? = null,
    val min: String = "",
    val max: String = "",
) {
    /** The API's query parameters for these filters (search text is added by the caller). */
    fun query(): Map<String, Any> = buildMap {
        type?.let { put("type", it) }
        if (planned) put("planned", "true")
        dateFrom?.let { put("date_from", it) }
        dateTo?.let { put("date_to", it) }
        account?.let { put("account_id", it.id) }
        card?.let { put("card_id", it.id) }
        category?.let { put("category_id", it.id) }
        if (tags.isNotEmpty()) { put("tag_id", tags.map { it.id }); put("tag_match", tagMatch) }
        method?.let { put("payment_method", it) }
        kind?.let { put("kind", it) }
        if (isAmount(min)) put("min_amount", min.trim())
        if (isAmount(max)) put("max_amount", max.trim())
    }

    /** How many filters the sheet holds (not counting the type and planned chips). */
    fun detailCount(): Int = listOfNotNull(
        (dateFrom ?: dateTo), account, card, category, tags.firstOrNull(), method, kind,
        min.takeIf { isAmount(it) }, max.takeIf { isAmount(it) },
    ).size

    fun isFiltered(): Boolean = type != null || planned || detailCount() > 0

    /** Back to nothing in the sheet, keeping the quick chips. */
    fun clearDetails(): TxFilters = TxFilters(type = type, planned = planned)
}

/** A non-negative decimal: what the API accepts for an amount limit. */
fun isAmount(text: String): Boolean = text.trim().toBigDecimalOrNull()?.let { it.signum() >= 0 } == true

fun TxFilters.toJson(): String = AppJson.encodeToString(TxFilters.serializer(), this)
fun txFiltersFromJson(text: String): TxFilters = try { AppJson.decodeFromString(TxFilters.serializer(), text) } catch (e: Exception) { TxFilters() }

enum class DatePreset(val label: String) { ThisMonth("This month"), LastMonth("Last month"), Last30("Last 30 days"), ThisYear("This year") }

/** The first and last day of a preset, as ISO dates. */
fun presetRange(preset: DatePreset, today: LocalDate = LocalDate.now()): Pair<String, String> = when (preset) {
    DatePreset.ThisMonth -> monthBounds(today).let { "${it.first}" to "${it.second}" }
    DatePreset.LastMonth -> monthBounds(today.minusMonths(1)).let { "${it.first}" to "${it.second}" }
    DatePreset.Last30 -> "${today.minusDays(29)}" to "$today"
    DatePreset.ThisYear -> "${today.withDayOfYear(1)}" to "$today"
}

/** "1 Nov – 30 Nov", or "From 1 Nov" / "Until 30 Nov" when one end is open. */
fun rangeLabel(from: String?, to: String?): String = when {
    from != null && to != null -> "${shortDate(from)} – ${shortDate(to)}"
    from != null -> "From ${shortDate(from)}"
    to != null -> "Until ${shortDate(to)}"
    else -> ""
}
