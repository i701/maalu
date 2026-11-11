package app.maalu.data

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** The last day a budget month can start on (every month has it), as in the API. */
const val MAX_START_DAY = 28

/** A problem with the day the budget month starts on, or null when it is fine. */
fun startDayProblem(text: String): String? {
    val n = text.trim().toIntOrNull() ?: return "Enter a day from 1 to $MAX_START_DAY."
    return if (n in 1..MAX_START_DAY) null else "Enter a day from 1 to $MAX_START_DAY."
}

/** A problem with the warning percent, or null when it is fine. */
fun warnPercentProblem(text: String): String? {
    val n = text.trim().toIntOrNull() ?: return "Enter a percent from 1 to 100."
    return if (n in 1..100) null else "Enter a percent from 1 to 100."
}

/** The body for `PATCH /budget`: only what changed. */
fun settingsJson(budget: Budget, startDay: String, warnPercent: String) = buildJsonObject {
    val d = startDay.trim().toInt()
    val w = warnPercent.trim().toInt()
    if (d != budget.periodStartDay) put("period_start_day", d)
    if (w != budget.warnPercent) put("warn_percent", w)
}

/** "Months start on the 1st · Warn at 80%". */
fun settingsText(budget: Budget): String {
    val d = budget.periodStartDay
    val suffix = when { d in 11..13 -> "th"; d % 10 == 1 -> "st"; d % 10 == 2 -> "nd"; d % 10 == 3 -> "rd"; else -> "th" }
    return "Months start on the $d$suffix · Warn at ${budget.warnPercent}%"
}
