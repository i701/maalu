package app.maalu.data

import java.math.BigDecimal
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Moving money between monthly limits, for one period only (a port of apps/web/src/lib/budget-moves.ts). A limit gives at most what it has left;
// a move with no source is a top-up. Undoing keeps the move in the history, marked undone.

private fun amountOf(s: String): BigDecimal = s.toBigDecimalOrNull() ?: BigDecimal.ZERO

/** A move in words from one limit's side: "+MVR 600.00 from Dining", "−MVR 600.00 to Groceries", "+MVR 300.00 added"; null when it does not touch that limit. */
fun moveText(move: BudgetMove, lineId: String, currency: String): String? {
    val amount = formatMoney(move.amount, currency)
    return when {
        move.toLine.id == lineId -> if (move.fromLine != null) "+$amount from ${move.fromLine.name}" else "+$amount added"
        move.fromLine?.id == lineId -> "−$amount to ${move.toLine.name}"
        else -> null
    }
}

/** A move as seen from one limit's card. */
data class LineMove(val id: String, val text: String, val note: String?)

/** The moves that touch a limit this period, for its card. */
fun movesFor(moves: List<BudgetMove>, lineId: String, currency: String): List<LineMove> =
    moves.mapNotNull { m -> moveText(m, lineId, currency)?.let { LineMove(m.id, it, m.note) } }

/** A limit money can come from: another monthly limit with what it has left this period; one with nothing left is listed but cannot be chosen. */
data class MoveSource(val line: BudgetLine, val left: String, val usable: Boolean)

/** The limits money can come from for [lineId], most left first. */
fun moveSources(budget: Budget, lineId: String): List<MoveSource> =
    budget.lines.filter { it.id != lineId }.map { MoveSource(it, it.available, amountOf(it.available).signum() > 0) }.sortedByDescending { amountOf(it.left) }

/** Why an amount cannot be moved from a source with [left] to spare (null for a top-up, which has no cap), or null when it can. The API checks again. */
fun moveProblem(amount: String, left: String?): String? {
    val a = amount.trim()
    if (!Regex("^\\d+(\\.\\d{1,4})?$").matches(a) || amountOf(a).signum() <= 0) return "Enter an amount greater than 0."
    if (left != null && amountOf(a) > amountOf(left)) return "That is more than it has left."
    return null
}

/** The body for `POST /budget/moves`: the limit that gets the money, where it comes from (none for a top-up), the amount, a day in the period and a note. */
fun moveJson(toId: String, fromId: String?, amount: String, on: String, note: String): JsonObject = buildJsonObject {
    put("to_line_id", toId)
    fromId?.let { put("from_line_id", it) }
    put("amount", amount.trim()); put("on", on)
    note.trim().takeIf { it.isNotEmpty() }?.let { put("note", it) }
}

/** A limit's history grouped by the period each move was for, newest period first, keeping the newest-first order inside each. */
data class MovePeriod(val start: String, val end: String, val entries: List<BudgetMove>)

fun historyByPeriod(entries: List<BudgetMove>): List<MovePeriod> =
    entries.groupBy { it.periodStart.orEmpty() }
        .map { (start, list) -> MovePeriod(start, list.first().periodEnd.orEmpty(), list) }
        .sortedByDescending { it.start }

/** When something happened, to the minute, in the viewer's time: "6 Nov, 11:58". */
fun madeAt(iso: String, zone: ZoneId = ZoneId.systemDefault()): String =
    runCatching { DateTimeFormatter.ofPattern("d MMM, HH:mm", Locale.ENGLISH).format(Instant.parse(iso).atZone(zone)) }.getOrDefault(iso)
