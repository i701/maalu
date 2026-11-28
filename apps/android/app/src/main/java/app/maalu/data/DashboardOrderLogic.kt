package app.maalu.data

/** A card on the Dashboard, in the default order. The ids are the saved ones, so do not rename them. */
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

/** The two summaries at the top, drawn flat on the page. */
val DashboardSection.isSummary: Boolean get() = this == DashboardSection.Available || this == DashboardSection.Metrics

/** The cards there are, in the default order: net worth is on Accounts, and Available to spend is for the current period only. */
fun dashboardSections(hasAvailable: Boolean): List<DashboardSection> =
    DashboardSection.entries.filter { it != DashboardSection.Balance && (it != DashboardSection.Available || hasAvailable) }

/** The cards on show in the saved order: ones the save does not know go last, in default order. Ported from the web's `orderSections`. */
fun orderSections(saved: List<String>?, visible: List<DashboardSection>): List<DashboardSection> {
    val rank = saved.orEmpty().withIndex().associate { (i, id) -> id to i }
    // sortedBy is stable, so cards sharing the unsaved rank keep their default order
    return visible.sortedBy { rank[it.id] ?: rank.size }
}

/** The order to save after arranging: a card with nothing to show is not arranged, so its id keeps its place and the arranged ones fill the rest. */
fun mergeOrder(saved: List<String>?, arranged: List<DashboardSection>): List<String> {
    val ids = arranged.map { it.id }
    val next = ids.iterator()
    val merged = saved.orEmpty().distinct().map { if (it in ids) next.next() else it }
    return merged + next.asSequence()
}
