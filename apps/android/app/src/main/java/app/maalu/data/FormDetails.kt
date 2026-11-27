package app.maalu.data

import java.time.LocalDate

// What the transaction form keeps under "More details", and what its closed row says about it.

/** Whether anything in there was chosen. The way of paying is always filled in, so only the person's own choice counts. */
fun AddForm.hasDetails(): Boolean {
    val own = planned || time != null || note.isNotBlank() || latitude.isNotBlank()
    return own || (type != "transfer" && (splitOn || cardId != null || tags.isNotEmpty() || methodTouched))
}

/** "Bank transfer · Planned · 2 tags": [card] is the chosen card's name, if any. */
fun AddForm.detailsSummary(card: String?): String {
    val spend = type != "transfer"
    return listOfNotNull(
        PaymentMethodLabels[method].takeIf { spend },
        card.takeIf { spend },
        "Split by items".takeIf { spend && splitOn },
        time,
        "Planned".takeIf { planned },
        tags.size.takeIf { spend && it > 0 }?.let { if (it == 1) "1 tag" else "$it tags" },
        "Note".takeIf { note.isNotBlank() },
        "Location".takeIf { latitude.isNotBlank() },
    ).joinToString(" · ")
}

/** "Today", "Yesterday", "Tomorrow" or the date. */
fun dateLabel(date: String, today: LocalDate): String = when (date) {
    "$today" -> "Today"
    "${today.minusDays(1)}" -> "Yesterday"
    "${today.plusDays(1)}" -> "Tomorrow"
    else -> shortDate(date)
}
