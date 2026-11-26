package app.maalu.data

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** A card on the Dashboard, in the default order. The ids are the web's, so one saved order (`users.dashboard_order`) arranges both. */
enum class DashboardSection(val id: String, val title: String) {
    Available("available", "Available to spend"),
    Metrics("metrics", "Income, spent and saved"),
    Spending("spending", "Spending by category"),
    Balance("balance", "Net worth"),
    Monthly("monthly", "Cash flow"),
    Budget("budget", "Budget and goals"),
    SpendingTrend("spending-trend", "Spending by month"),
    NeedsWants("needs-wants", "Needs and wants"),
    MoneyFlow("money-flow", "Money flow"),
    Credit("credit", "Credit used"),
    Upcoming("upcoming", "Coming up"),
    Latest("latest", "Latest transactions"),
}

/** The cards on show in the saved order: ones the save does not know go last, in default order. Ported from the web's `orderSections`. */
fun orderSections(saved: List<String>?, visible: List<DashboardSection>): List<DashboardSection> {
    val rank = saved.orEmpty().withIndex().associate { (i, id) -> id to i }
    // sortedBy is stable, so cards sharing the unsaved rank keep their default order
    return visible.sortedBy { rank[it.id] ?: rank.size }
}

/**
 * The order to save after arranging. The list is shared with the other apps, which have cards of their own (and a card with
 * nothing to show is not arranged here), so an id that was not arranged keeps its place and the arranged ones fill the rest.
 */
fun mergeOrder(saved: List<String>?, arranged: List<DashboardSection>): List<String> {
    val ids = arranged.map { it.id }
    val next = ids.iterator()
    val merged = saved.orEmpty().distinct().map { if (it in ids) next.next() else it }
    return merged + next.asSequence()
}

/** The body of `PATCH /users/me`: an explicit null goes back to the default order. */
fun dashboardOrderJson(order: List<String>?): JsonObject = buildJsonObject {
    put("dashboard_order", order?.let { ids -> buildJsonArray { ids.forEach { add(JsonPrimitive(it)) } } } ?: JsonNull)
}
