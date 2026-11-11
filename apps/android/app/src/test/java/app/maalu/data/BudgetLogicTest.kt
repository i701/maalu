package app.maalu.data

import java.math.BigDecimal
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BudgetLogicTest {
    private fun line(kind: String?, activity: String, amount: String, carried: String = "0", movedIn: String = "0", movedOut: String = "0") =
        BudgetLine("i", "L", activity, amount, "0", 0, "ok", carried, movedIn, movedOut, kind = kind)

    @Test fun aLimitAllowsItsAmountPlusCarriedAndMovedIn() {
        assertEquals(0, BigDecimal("1100").compareTo(line(null, "0", "1000", carried = "200", movedIn = "100", movedOut = "200").allowed()))
    }

    @Test fun periodsAreNamedByTheirMonthOrTheirDays() {
        assertEquals("November 2026", periodLabel("2026-11-01", "2026-11-30"))
        assertEquals("10 Oct – 9 Nov", periodLabel("2026-10-10", "2026-11-09"))
    }

    @Test fun steppingMovesByAMonth() {
        val p = BudgetPeriod("2026-11-01", "2026-11-30", true)
        assertEquals("2026-12-01", stepPeriod(p, 1).toString())
        assertEquals("2026-10-01", stepPeriod(p, -1).toString())
    }

    @Test fun kindsAreOnlyShownWhenSomeLimitHasOne() {
        assertTrue(budgetByKind(listOf(line(null, "5", "10"))).isEmpty())
        val kinds = budgetByKind(listOf(line("need", "5", "10"), line("want", "2", "4"), line("need", "1", "2"), line(null, "9", "9")))
        assertEquals(listOf("need", "want", null), kinds.map { it.kind })
        assertEquals(0, BigDecimal("6").compareTo(kinds.first().spent))
        assertEquals(0, BigDecimal("12").compareTo(kinds.first().limit))
    }

    @Test fun leftTextSaysOverWhenBelowZero() {
        assertEquals("MVR 250.00 left", leftText("250", "MVR"))
        assertEquals("Over by MVR 40.00", leftText("-40", "MVR"))
    }

    @Test fun aLimitNeedsANameAnAmountAndACategory() {
        assertEquals(LineField.Name, LineForm().problem()?.field)
        assertEquals(LineField.Amount, LineForm(name = "Food").problem()?.field)
        assertEquals(LineField.Categories, LineForm(name = "Food", amount = "500").problem()?.field)
        assertNull(LineForm(name = "Food", amount = "500", categoryIds = listOf("c1")).problem())
    }

    @Test fun aLimitBodyListsItsCategories() {
        val j = LineForm("Food", "500", listOf("c1", "c2"), rollover = true).toJson()
        assertEquals(2, j["category_ids"]!!.jsonArray.size)
        assertEquals("true", j["rollover"]!!.jsonPrimitive.content)
        assertTrue(!LineForm("Food", "500", listOf("c1")).toJson().containsKey("rollover"))
    }

    @Test fun editingALimitSendsOnlyTheChanges() {
        val before = LineForm("Food", "500", listOf("c1", "c2"))
        assertTrue(before.patchJson(before).isEmpty())
        assertTrue(before.copy(amount = "500.00", categoryIds = listOf("c2", "c1")).patchJson(before).isEmpty())
        val j = before.copy(amount = "600", rollover = true).patchJson(before)
        assertEquals(setOf("amount", "rollover"), j.keys)
    }

    @Test fun aGoalNeedsANameAndATarget() {
        assertEquals(GoalField.Name, GoalForm().problem()?.field)
        assertEquals(GoalField.Target, GoalForm(name = "Trip").problem()?.field)
        assertEquals(GoalField.Monthly, GoalForm(name = "Trip", target = "5000", monthly = "0").problem()?.field)
        assertNull(GoalForm(name = "Trip", target = "5000").problem())
    }

    @Test fun aGoalFollowingAnAccountSendsItsId() {
        val j = GoalForm("Fund", "10000", account = Ref("a1", "Savings"), monthly = "500", targetDate = "2027-06-01").toJson()
        assertEquals("a1", j["account_id"]!!.jsonPrimitive.content)
        assertEquals("500", j["monthly_amount"]!!.jsonPrimitive.content)
        assertEquals("2027-06-01", j["target_date"]!!.jsonPrimitive.content)
    }

    @Test fun clearingAGoalsDetailsSendsNulls() {
        val before = GoalForm("Fund", "10000", Ref("a1", "S"), "500", "2027-06-01")
        val j = before.copy(account = null, monthly = "", targetDate = null).patchJson(before)
        assertEquals(setOf("account_id", "monthly_amount", "target_date"), j.keys)
        assertTrue(j["account_id"] is kotlinx.serialization.json.JsonNull)
    }

    @Test fun aSetAsideCanBeTakenBackOut() {
        assertEquals("200", goalEntryJson("200", take = false)["amount"]!!.jsonPrimitive.content)
        assertEquals("-200", goalEntryJson("200", take = true)["amount"]!!.jsonPrimitive.content)
    }

    @Test fun theGoalLineSaysWhatEachMonthNeeds() {
        val g = Goal("g", "Trip", "MVR", "0", "5000", 0, targetDate = "2027-03-01", monthsLeft = 4, neededPerMonth = "1250")
        assertEquals("Needs MVR 1,250.00 a month for 4 more months", goalNeedText(g))
        assertEquals("Needs MVR 5,000.00 a month for 1 more month", goalNeedText(g.copy(monthsLeft = 1, neededPerMonth = "5000")))
        assertNull(goalNeedText(g.copy(targetDate = null)))
    }

    @Test fun onlyRunningLimitsForSetDatesAreShownOnTheDashboard() {
        fun fixed(id: String, state: String) = FixedLine(id, id, "10", "100", "90", 10, "ok", "2026-11-01", "2026-11-20", state)
        val b = Budget("MVR", null, BudgetTotals("0", "0", "0", 0, "ok"), emptyList(), listOf(fixed("a", "active"), fixed("u", "upcoming"), fixed("e", "ended")))
        assertEquals(listOf("a"), runningFixed(b).map { it.id })
        assertEquals("until 20 Nov", untilText(fixed("a", "active")))
    }

    private fun fx(id: String, start: String, end: String, vararg cats: String) = FixedLine(id, "Limit $id", "0", "100", "100", 0, "ok", start, end, "active", categories = cats.map { IdName(it, "Cat $it") })
    private fun budgetOf(lines: List<BudgetLine> = emptyList(), fixed: List<FixedLine> = emptyList()) =
        Budget("MVR", BudgetPeriod("2026-11-01", "2026-11-30", true), BudgetTotals("0", "0", "0", 0, "ok"), lines, fixed)

    @Test fun theNextStretchIsAsLongAndStartsTheDayAfter() {
        assertEquals("2026-11-21" to "2026-11-30", nextStretch("2026-11-11", "2026-11-20"))
        assertEquals("2027-01-01" to "2027-01-01", nextStretch("2026-12-31", "2026-12-31"))
        val f = fx("a", "2026-11-09", "2026-11-20", "c1")
        val r = repeatFormFrom(f)
        assertEquals("2026-11-21", r.start); assertEquals("2026-12-02", r.end); assertEquals(listOf("c1"), r.categoryIds); assertEquals(false, r.repeat)
    }

    @Test fun datesProblemsAndTheRequestBody() {
        val base = LineForm("Trip", "500", listOf("c1"), rollover = true, dated = true, start = "2026-11-09", end = "2026-11-20")
        assertNull(base.problem())
        assertEquals(LineField.Dates, base.copy(end = "").problem()!!.field); assertEquals(LineField.Dates, base.copy(end = "2026-11-01").problem()!!.field)
        val total = base.toJson()
        assertEquals("2026-11-09", total["start_date"]!!.jsonPrimitive.content); assertEquals("false", total["repeat"]!!.jsonPrimitive.content)
        assertTrue(!total.containsKey("rollover"))                                   // one total has nothing to roll into
        assertTrue(base.copy(repeat = true).toJson().containsKey("rollover"))        // a monthly one between dates does
        assertTrue(!LineForm("A", "5", listOf("c")).toJson().containsKey("start_date"))
    }

    @Test fun editingDatesSendsThemTogetherOrClearsThem() {
        val monthly = LineForm("Food", "500", listOf("c1"))
        val dated = monthly.copy(dated = true, start = "2026-11-01", end = "2026-11-30")
        assertTrue(dated.patchJson(monthly).containsKey("start_date"))               // monthly -> for set dates
        assertEquals(0, dated.patchJson(dated).size)                                  // nothing changed, nothing sent
        assertEquals("2026-12-31", dated.copy(end = "2026-12-31").patchJson(dated)["end_date"]!!.jsonPrimitive.content)
        assertEquals(kotlinx.serialization.json.JsonNull, monthly.patchJson(dated)["end_date"])   // dates turned off: every period again
    }

    @Test fun categoriesTakenByOtherLimits() {
        val b = budgetOf(
            lines = listOf(BudgetLine("l1", "Eating out", "0", "600", "600", 0, "ok", categories = listOf(IdName("dining", "Dining")))),
            fixed = listOf(fx("f1", "2026-11-09", "2026-11-20", "groceries")),
        )
        // a monthly limit conflicts with the monthly ones only
        assertEquals(setOf("dining"), takenCategories(b, LineForm(), null).keys)
        // a limit for set dates conflicts with the ones whose dates overlap, not with monthly ones
        assertEquals(setOf("groceries"), takenCategories(b, LineForm(dated = true, start = "2026-11-15", end = "2026-11-25"), null).keys)
        assertEquals(emptySet<String>(), takenCategories(b, LineForm(dated = true, start = "2026-12-01", end = "2026-12-05"), null).keys)
        // editing a limit does not conflict with itself; a monthly one between dates is left to the server
        assertEquals(emptySet<String>(), takenCategories(b, LineForm(dated = true, start = "2026-11-15", end = "2026-11-25"), "f1").keys)
        assertEquals(emptySet<String>(), takenCategories(b, LineForm(dated = true, repeat = true, start = "2026-11-01", end = "2027-01-31"), null).keys)
    }

    @Test fun onlyLimitsTouchingThePeriodAreListed() {
        val b = budgetOf(fixed = listOf(fx("nov", "2026-11-09", "2026-11-20"), fx("dec", "2026-12-05", "2026-12-10"), fx("span", "2026-10-25", "2026-11-02")))
        assertEquals(listOf("nov", "span"), fixedInPeriod(b).map { it.id })
        assertEquals("Runs 1 Nov – 31 Jan", runsText(BudgetLine("l", "L", "0", "1", "1", 0, "ok", runsFrom = "2026-11-01", runsUntil = "2027-01-31")))
        assertNull(runsText(BudgetLine("l", "L", "0", "1", "1", 0, "ok")))
    }
}
