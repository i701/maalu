package app.maalu.data

import java.math.BigDecimal
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Ported from apps/web/src/lib/budget.ts and the goal helpers: keep them in step (the web tests are the spec).

val StatusLabels = mapOf("ok" to "On track", "warning" to "Close to limit", "over" to "Over the limit")

fun statusLabel(status: String): String = StatusLabels[status] ?: status

/** "-12.5" as "12.5": an amount shown after "Over by". */
fun unsigned(value: String): String = value.removePrefix("-")

private fun dec(s: String): BigDecimal = s.toBigDecimalOrNull() ?: BigDecimal.ZERO

/** What a limit allows this period: its amount, what was carried in and what was moved in, less what was moved out. */
fun BudgetLine.allowed(): BigDecimal = dec(amount) + dec(carried) + dec(movedIn) - dec(movedOut)

/** "November 2026" for a whole calendar month, else "10 Oct – 9 Nov": a period may start on any day. */
fun periodLabel(start: String, end: String): String {
    val s = LocalDate.parse(start); val e = LocalDate.parse(end)
    val wholeMonth = s.dayOfMonth == 1 && e == s.plusMonths(1).minusDays(1)
    if (wholeMonth) return monthLabel(s)
    return "${shortDate(start)} – ${shortDate(end)}"
}

/** The date to ask the budget for when stepping a period: a day inside the next or previous one. */
fun stepPeriod(period: BudgetPeriod, months: Int): LocalDate =
    LocalDate.parse(period.start).plusMonths(months.toLong())

data class KindBudget(val kind: String?, val spent: BigDecimal, val limit: BigDecimal)

/** Needs, wants and the limits that are neither, each with what was spent against what it allows. */
fun budgetByKind(lines: List<BudgetLine>): List<KindBudget> {
    if (lines.none { it.kind != null }) return emptyList()
    return listOf("need", "want", null).mapNotNull { k ->
        val mine = lines.filter { it.kind == k }
        if (mine.isEmpty()) null else KindBudget(k, mine.fold(BigDecimal.ZERO) { a, l -> a + dec(l.activity) }, mine.fold(BigDecimal.ZERO) { a, l -> a + l.allowed() })
    }
}

/** "1,000 left" or "Over by 250": the line under a limit's bar. */
fun leftText(available: String, currency: String): String {
    val v = dec(available)
    return if (v.signum() < 0) "Over by ${formatMoney(unsigned(available), currency)}" else "${formatMoney(available, currency)} left"
}

// ---- monthly limits: the form ----

data class LineForm(
    val name: String = "",
    val amount: String = "",
    val categoryIds: List<String> = emptyList(),
    val rollover: Boolean = false,
)

enum class LineField { Name, Amount, Categories }
data class LineProblem(val field: LineField, val message: String)

fun LineForm.problem(): LineProblem? {
    if (name.isBlank()) return LineProblem(LineField.Name, "Give the limit a name.")
    if (!isPositive(amount)) return LineProblem(LineField.Amount, "Enter an amount above zero.")
    if (categoryIds.isEmpty()) return LineProblem(LineField.Categories, "Choose at least one category.")
    return null
}

fun LineForm.toJson(): JsonObject = buildJsonObject {
    put("name", name.trim())
    put("amount", amount.trim())
    put("category_ids", JsonArray(categoryIds.map { JsonPrimitive(it) }))
    if (rollover) put("rollover", true)
}

fun lineFormFrom(l: BudgetLine): LineForm = LineForm(l.name, tidyAmount(l.amount), l.categories.map { it.id }, l.rollover)

fun LineForm.patchJson(before: LineForm): JsonObject = buildJsonObject {
    if (name.trim() != before.name.trim()) put("name", name.trim())
    if (amount.toBigDecimalOrNull()?.compareTo(before.amount.toBigDecimalOrNull() ?: BigDecimal.valueOf(-1)) != 0) put("amount", amount.trim())
    if (categoryIds.toSet() != before.categoryIds.toSet()) put("category_ids", JsonArray(categoryIds.map { JsonPrimitive(it) }))
    if (rollover != before.rollover) put("rollover", rollover)
}

// ---- savings goals ----

data class GoalForm(
    val name: String = "",
    val target: String = "",
    val account: Ref? = null,
    val monthly: String = "",
    val targetDate: String? = null,
)

enum class GoalField { Name, Target, Monthly }
data class GoalProblem(val field: GoalField, val message: String)

fun GoalForm.problem(): GoalProblem? {
    if (name.isBlank()) return GoalProblem(GoalField.Name, "Give the goal a name.")
    if (!isPositive(target)) return GoalProblem(GoalField.Target, "Enter a target above zero.")
    if (monthly.isNotBlank() && !isPositive(monthly)) return GoalProblem(GoalField.Monthly, "The monthly amount must be above zero.")
    return null
}

fun GoalForm.toJson(): JsonObject = buildJsonObject {
    put("name", name.trim())
    put("target_amount", target.trim())
    account?.let { put("account_id", it.id) }
    monthly.trim().takeIf { it.isNotEmpty() }?.let { put("monthly_amount", it) }
    targetDate?.let { put("target_date", it) }
}

fun goalFormFrom(g: Goal): GoalForm = GoalForm(
    g.name, tidyAmount(g.targetAmount), g.account?.let { Ref(it.id, it.name) }, g.monthlyAmount?.let(::tidyAmount).orEmpty(), g.targetDate,
)

fun GoalForm.patchJson(before: GoalForm): JsonObject = buildJsonObject {
    fun num(a: String, b: String) = a.toBigDecimalOrNull()?.compareTo(b.toBigDecimalOrNull() ?: BigDecimal.valueOf(-1)) == 0
    if (name.trim() != before.name.trim()) put("name", name.trim())
    if (!num(target, before.target)) put("target_amount", target.trim())
    if (account?.id != before.account?.id) { if (account == null) put("account_id", JsonNull) else put("account_id", account.id) }
    if (monthly.isBlank() != before.monthly.isBlank() || (monthly.isNotBlank() && !num(monthly, before.monthly))) {
        if (monthly.isBlank()) put("monthly_amount", JsonNull) else put("monthly_amount", monthly.trim())
    }
    if (targetDate != before.targetDate) { if (targetDate == null) put("target_date", JsonNull) else put("target_date", targetDate) }
}

/** "Needs MVR 500 a month for 4 more months", the line under a goal with a date (port of the goal card's text). */
fun goalNeedText(g: Goal): String? {
    if (g.targetDate == null) return null
    if (g.monthsLeft == 0) return "Target date ${shortDate(g.targetDate)} has passed"
    val months = g.monthsLeft ?: 0
    return "Needs ${formatMoney(g.neededPerMonth ?: "0", g.currency)} a month for $months more ${if (months == 1) "month" else "months"}"
}

/** A set-aside entry: positive puts money aside, negative takes it back out. */
fun goalEntryJson(amount: String, take: Boolean): JsonObject = buildJsonObject {
    put("amount", (if (take) "-" else "") + amount.trim())
}

/** The limits for set dates that are running now (the ones the dashboard shows beside the per-period limits). */
fun runningFixed(budget: Budget): List<FixedLine> = budget.fixedLines.filter { it.state == "active" }

/** "until 20 Nov" for a running limit for set dates. */
fun untilText(f: FixedLine): String = "until ${shortDate(f.endDate)}"
