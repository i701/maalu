package app.maalu.data

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.time.format.TextStyle
import java.util.Locale
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Ported from apps/web/src/lib/plan.ts, mark-paid.ts and planned.ts: keep them in step (the web tests are the spec).

private fun dec(s: String): BigDecimal = s.toBigDecimalOrNull() ?: BigDecimal.ZERO

enum class PlanKind { Bill, Income, Card }

/** One planned payment or planned income on the plan, with what is left after it. */
data class PlanRow(
    val id: String,
    val kind: PlanKind,
    val title: String,
    val date: String,
    val overdue: Boolean,
    val amount: String,
    val account: String?,
    val subscription: String?,
    /** Only a guess: its subscription's amount varies, so the real one is entered when it is paid. */
    val estimate: Boolean,
    /** What is available once this bill is paid; null for income, which is not counted. */
    val left: BigDecimal?,
    /** Paying this bill leaves less than nothing. */
    val short: Boolean,
    /** The first bill that does: where the plan runs out. */
    val firstShort: Boolean,
    /** A planned transfer between your accounts rather than a bill or pay. */
    val transfer: Boolean,
    /** A credit card statement: the card's id, to open its page. */
    val cardId: String?,
)

/** The rows of one day, or all the overdue ones together. */
data class PlanDay(val key: String, val overdue: Boolean, val date: String?, val rows: List<PlanRow>)

/** What is available before any bill: the everyday accounts less what is set aside for goals. */
fun startingPoint(balance: String, reservedTotal: String): BigDecimal = dec(balance) - dec(reservedTotal)

/** Below zero: the plan does not cover everything. */
fun AvailableToSpend.isShort(): Boolean = dec(available).signum() < 0

/**
 * The bills and planned income laid out by day, overdue first, with the running figure: each bill takes its amount off what
 * is available, so you can see which one makes the month run short. Income is listed on its day but never added.
 */
fun planDays(data: AvailableToSpend): List<PlanDay> {
    data class Raw(val id: String, val kind: PlanKind, val title: String, val date: String, val overdue: Boolean, val amount: String,
                   val account: String?, val subscription: String?, val estimate: Boolean, val transfer: Boolean, val cardId: String?)
    val raws = data.bills.map { Raw(it.id, PlanKind.Bill, it.title, it.date, it.overdue, it.amount, it.account, it.subscription, it.estimate, it.transfer, null) } +
        data.cardPayments.map { Raw(it.accountId, PlanKind.Card, "${it.title} card payment", it.date, it.overdue, it.amount, null, null, false, false, it.accountId) } +
        data.expected.map { Raw(it.id, PlanKind.Income, it.title, it.date, it.overdue, it.amount, it.account, it.subscription, it.estimate, it.transfer, null) }
    val sorted = raws.sortedWith(
        compareByDescending<Raw> { it.overdue }
            .thenBy { it.date }
            // income after what is paid on the same day
            .thenBy { if (it.kind == PlanKind.Income) 1 else 0 }
            .thenBy { it.title.lowercase() },
    )
    var running = startingPoint(data.balance, data.reservedTotal)
    var foundShort = false
    val days = mutableListOf<PlanDay>()
    for (r in sorted) {
        var left: BigDecimal? = null
        if (r.kind != PlanKind.Income) { running -= dec(r.amount); left = running }
        val short = left != null && left.signum() < 0
        val firstShort = short && !foundShort
        foundShort = foundShort || short
        val row = PlanRow(r.id, r.kind, r.title, r.date, r.overdue, r.amount, r.account, r.subscription, r.estimate, left, short, firstShort, r.transfer, r.cardId)
        val key = if (r.overdue) "overdue" else r.date
        val last = days.lastOrNull()
        if (last != null && last.key == key) days[days.size - 1] = last.copy(rows = last.rows + row)
        else days += PlanDay(key, r.overdue, if (r.overdue) null else r.date, listOf(row))
    }
    return days
}

/** "Overdue", "Today", "Tomorrow", or "Thu 6 Nov" for a day group. */
fun planDayLabel(day: PlanDay, today: String): String {
    val date = day.date ?: return "Overdue"
    val away = ChronoUnit.DAYS.between(LocalDate.parse(today), LocalDate.parse(date))
    return when (away) {
        0L -> "Today"
        1L -> "Tomorrow"
        else -> LocalDate.parse(date).let { "${it.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${it.dayOfMonth} ${it.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)}" }
    }
}

/** The first bill that leaves less than nothing, if any. */
fun firstShortRow(days: List<PlanDay>): PlanRow? = days.firstNotNullOfOrNull { d -> d.rows.firstOrNull { it.firstShort } }

// ---- marking a planned payment as paid ----

/** An amount in a bill's own currency times a rate, in the base currency: rounded half to even at four decimals, null when either is not a number. */
fun baseOf(amount: String, rate: String): String? {
    val a = amount.trim().toBigDecimalOrNull() ?: return null
    val r = rate.trim().toBigDecimalOrNull() ?: return null
    return a.multiply(r).setScale(4, RoundingMode.HALF_EVEN).toPlainString()
}

/** Whether two rates are the same number, however they are written ("15.4" and "15.40000000"). */
fun sameRate(a: String, b: String): Boolean {
    val x = a.trim().toBigDecimalOrNull() ?: return false
    val y = b.trim().toBigDecimalOrNull() ?: return false
    return x.compareTo(y) == 0
}

/** What a paid bill sends besides its date: the amount, and for another currency what it really cost or the rate it was paid at. */
data class PayAmounts(val amount: String, val exchangeRate: String? = null, val baseAmount: String? = null)

/**
 * What to send when a bill is marked as paid. The amount always goes. For a bill in another currency, **what it really cost**
 * in the base currency wins (the rate is worked out from it); otherwise a rate that differs from the planned one goes, and an
 * unchanged rate is left out so the planned one stays.
 */
fun payBody(amount: String, foreign: Boolean, rate: String, plannedRate: String, charged: String): PayAmounts {
    if (!foreign) return PayAmounts(amount)
    if (charged.trim().isNotEmpty()) return PayAmounts(amount, baseAmount = charged.trim())
    if (rate.trim().isNotEmpty() && !sameRate(rate, plannedRate)) return PayAmounts(amount, exchangeRate = rate.trim())
    return PayAmounts(amount)
}

/** The request for `POST /transactions/{id}/post`: when it happened (an explicit null time clears the planned one), and for a transfer nothing else. */
fun markPaidJson(date: String, time: String?, pay: PayAmounts?): JsonObject = buildJsonObject {
    put("transaction_date", date)
    if (time == null) put("transaction_time", JsonNull) else put("transaction_time", if (time.length == 5) "$time:00" else time)
    pay?.let {
        put("amount", it.amount.trim())
        it.exchangeRate?.let { r -> put("exchange_rate", r) }
        it.baseAmount?.let { b -> put("base_amount", b) }
    }
}

/** What the action is called for a planned transaction: a transfer is done, income received, anything else paid. */
fun payVerb(type: String): String = when (type) { "transfer" -> "done"; "income" -> "received"; else -> "paid" }

fun payTitle(type: String): String = "Mark as ${payVerb(type)}"

/** "Due today", "Due tomorrow", "Due in 5 days", "1 day overdue", "3 days overdue". */
fun dueLabel(date: String, today: String): String {
    val days = ChronoUnit.DAYS.between(LocalDate.parse(today), LocalDate.parse(date))
    return when {
        days == 0L -> "Due today"
        days == 1L -> "Due tomorrow"
        days > 1 -> "Due in $days days"
        else -> "${-days} ${if (-days == 1L) "day" else "days"} overdue"
    }
}
