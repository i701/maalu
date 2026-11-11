package app.maalu.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.math.BigDecimal

// Splitting a salary between accounts and goals, ported from the web's lib/salary.ts. The server works every line out and
// checks every rule again when it is applied; this is what the screens need to show the proposal, let a person edit it and
// add it up exactly before sending it.

@Serializable
data class SalaryRule(
    val id: String,
    @SerialName("target_type") val targetType: String,
    @SerialName("account_id") val accountId: String? = null,
    @SerialName("goal_id") val goalId: String? = null,
    @SerialName("target_name") val targetName: String,
    val mode: String,
    val value: String,
    val auto: Boolean = false,
) {
    /** The account's or the goal's id, whichever this rule points at. */
    val targetId: String get() = accountId ?: goalId.orEmpty()
}

@Serializable
data class SplitItem(
    @SerialName("rule_id") val ruleId: String,
    @SerialName("target_type") val targetType: String,
    @SerialName("target_id") val targetId: String,
    @SerialName("target_name") val targetName: String,
    val amount: String,
    val mode: String,
    val value: String,
    val ok: Boolean,
    val reason: String? = null,
    val auto: Boolean = false,
    val done: Boolean = false,
)

@Serializable
data class SplitMade(val kind: String, val id: String, @SerialName("target_name") val targetName: String, val amount: String)

@Serializable
data class SplitPlan(
    @SerialName("salary_id") val salaryId: String,
    val title: String = "",
    @SerialName("salary_date") val salaryDate: String? = null,
    val amount: String,
    val currency: String,
    @SerialName("account_id") val accountId: String,
    @SerialName("account_name") val accountName: String,
    val applied: Boolean = false,
    val complete: Boolean = false,
    val items: List<SplitItem> = emptyList(),
    val total: String = "0",
    val left: String = "0",
    val over: Boolean = false,
    val made: List<SplitMade> = emptyList(),
)

@Serializable
data class SplitTask(val id: String, val plan: SplitPlan)

@Serializable
data class SplitCount(val count: Int = 0)

@Serializable
data class SplitResult(val transfers: Int = 0, val entries: Int = 0)

private const val SCALE = 4

/** "10% of each salary" or "MVR 1,500.00 each time". */
fun ruleText(mode: String, value: String, currency: String): String =
    if (mode == "percent") "${tidyNumber(value)}% of each salary" else "${formatMoneyFull(value, currency)} each time"

/** A decimal string without trailing zeros: `"10.0000"` is `10`. */
fun tidyNumber(value: String): String = value.toBigDecimalOrNull()?.stripTrailingZeros()?.toPlainString() ?: value

/** What a set of rules sends on, as one sentence: "10% of the salary + MVR 500.00". */
fun rulesSummary(rules: List<SalaryRule>, currency: String): String {
    val percent = rules.filter { it.mode == "percent" }.fold(BigDecimal.ZERO) { sum, r -> sum + (r.value.toBigDecimalOrNull() ?: BigDecimal.ZERO) }
    val fixed = rules.filter { it.mode == "fixed" }
    val parts = buildList {
        if (percent.signum() > 0) add("${percent.stripTrailingZeros().toPlainString()}% of the salary")
        fixed.forEach { add(formatMoneyFull(it.value, currency)) }
    }
    return parts.joinToString(" + ")
}

/** One line of the split being confirmed: a rule's target with an amount that can be edited. */
data class SplitLine(
    val key: String,
    val targetType: String,
    val targetId: String,
    val name: String,
    val rule: String,
    val amount: String,
    /** Whether it will be made. */
    val on: Boolean,
    /** Why it can't be made, when it can't (or "Already made"). */
    val reason: String?,
    val done: Boolean,
    val auto: Boolean,
)

/** The lines to confirm, from a plan: those that can be made start ticked, the rest show their reason and cannot be ticked. */
fun splitLines(plan: SplitPlan): List<SplitLine> = plan.items.map { i ->
    SplitLine(
        key = i.ruleId, targetType = i.targetType, targetId = i.targetId, name = i.targetName,
        rule = ruleText(i.mode, i.value, plan.currency),
        amount = tidyAmountText(i.amount),
        on = i.ok && !i.done,
        reason = if (i.done) "Already made" else if (i.ok) null else (i.reason ?: "Can't be made"),
        done = i.done, auto = i.auto,
    )
}

/** An amount for a text field: no trailing zeros past the cents (`"2000.0000"` is `2000`, `"12.5000"` is `12.5`). */
fun tidyAmountText(value: String): String = value.toBigDecimalOrNull()?.stripTrailingZeros()?.let { if (it.scale() < 0) it.setScale(0) else it }?.toPlainString() ?: value

/** A positive number with at most four decimals, or null. */
fun parseAmount(text: String): BigDecimal? {
    val v = text.trim().toBigDecimalOrNull() ?: return null
    if (v.signum() <= 0) return null
    return if (v.stripTrailingZeros().scale() > SCALE) null else v
}

data class SplitTotals(
    /** The ticked lines added up, exactly. */
    val total: String,
    /** What stays in the account. */
    val left: String,
    /** More than the salary is being sent. */
    val over: Boolean,
    /** A ticked line has an amount that is not a positive number. */
    val invalid: Boolean,
    val count: Int,
)

/**
 * Adds the ticked lines up against the salary, exactly. [made] is what an automatic rule or an earlier approval already
 * sent, which counts against the salary too.
 */
fun splitTotals(lines: List<SplitLine>, salary: String, made: String = "0"): SplitTotals {
    val ticked = lines.filter { it.on }
    var total = BigDecimal.ZERO
    var invalid = false
    for (line in ticked) {
        val v = parseAmount(line.amount)
        if (v == null) invalid = true else total += v
    }
    val whole = salary.toBigDecimalOrNull() ?: BigDecimal.ZERO
    val sent = made.toBigDecimalOrNull() ?: BigDecimal.ZERO
    return SplitTotals(
        total = total.setScale(SCALE).toPlainString(), left = (whole - sent - total).setScale(SCALE).toPlainString(),
        over = sent + total > whole, invalid = invalid, count = ticked.size,
    )
}

/** The body for `POST /transactions/{id}/salary-split`: the ticked lines. */
fun splitRequest(lines: List<SplitLine>): JsonObject = buildJsonObject {
    put("items", buildJsonArray {
        lines.filter { it.on }.forEach { l ->
            add(buildJsonObject {
                put("target_type", l.targetType); put("target_id", l.targetId)
                put("amount", (parseAmount(l.amount) ?: BigDecimal.ZERO).stripTrailingZeros().toPlainString())
            })
        }
    })
}

/** What the made lines of a plan add up to. */
fun madeTotal(plan: SplitPlan): String = plan.made.fold(BigDecimal.ZERO) { s, m -> s + (m.amount.toBigDecimalOrNull() ?: BigDecimal.ZERO) }.setScale(2, java.math.RoundingMode.HALF_EVEN).toPlainString()

/** What is left to approve: lines that can be made and have not been. */
fun pendingLines(plan: SplitPlan): List<SplitItem> = plan.items.filter { it.ok && !it.done }

/** The lines as the Pending screen's Approve makes them: every one that is left, as proposed. */
fun approveLines(plan: SplitPlan): List<SplitLine> = splitLines(plan).filter { it.on }

/** What is wrong with a rule before it is sent (the server checks again), or null. */
fun ruleProblem(mode: String, value: String, hasTarget: Boolean): String? {
    val v = value.trim().toBigDecimalOrNull()
    return when {
        !hasTarget -> "Choose an account or a goal."
        v == null || v.signum() <= 0 -> "Enter an amount above zero."
        v.stripTrailingZeros().scale() > SCALE -> "At most four decimals."
        mode == "percent" && v > BigDecimal(100) -> "A share can't be more than 100%."
        else -> null
    }
}

fun createRuleJson(targetType: String, targetId: String, mode: String, value: String, auto: Boolean): JsonObject = buildJsonObject {
    put(if (targetType == "account") "account_id" else "goal_id", targetId)
    put("mode", mode); put("value", value.trim()); put("auto", auto)
}

fun updateRuleJson(mode: String, value: String, auto: Boolean): JsonObject = buildJsonObject {
    put("mode", mode); put("value", value.trim()); put("auto", auto)
}

/** Whether a posted income can be split: pay, in an account, that has arrived. */
fun canSplitSalary(t: Transaction): Boolean = t.type == "income" && t.categoryIsSalary && t.account != null && !t.planned

/** Whether a planned income, once received, should offer the split. */
fun isSalaryToSplit(t: Transaction): Boolean = t.type == "income" && t.categoryIsSalary && t.account != null
