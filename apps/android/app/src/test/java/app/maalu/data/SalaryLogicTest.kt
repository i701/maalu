package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SalaryLogicTest {
    private fun item(id: String, amount: String, ok: Boolean = true, done: Boolean = false, auto: Boolean = false, reason: String? = null, mode: String = "percent", value: String = "10") =
        SplitItem(id, "account", "t-$id", "Target $id", amount, mode, value, ok, reason, auto, done)

    private fun plan(items: List<SplitItem>, made: List<SplitMade> = emptyList(), amount: String = "10000.0000") = SplitPlan(
        salaryId = "s", title = "Salary", amount = amount, currency = "MVR", accountId = "a", accountName = "BML Current", items = items, made = made,
    )

    @Test fun ruleTextReadsInPlainWords() {
        assertEquals("10% of each salary", ruleText("percent", "10.0000", "MVR"))
        assertEquals("MVR 1,500.00 each time", ruleText("fixed", "1500.0000", "MVR"))
    }

    @Test fun rulesAreSummedUp() {
        val rules = listOf(
            SalaryRule("1", "account", "a", null, "Savings", "percent", "10"),
            SalaryRule("2", "account", "b", null, "Other", "percent", "15"),
            SalaryRule("3", "goal", null, "g", "Goal", "fixed", "500"),
        )
        assertEquals("25% of the salary + MVR 500.00", rulesSummary(rules, "MVR"))
        assertEquals("", rulesSummary(emptyList(), "MVR"))
    }

    @Test fun linesThatCanBeMadeStartTickedAndTheRestExplainWhy() {
        val lines = splitLines(plan(listOf(
            item("1", "1000.0000"), item("2", "500.0000", done = true), item("3", "700.0000", ok = false, reason = "That account is archived"),
        )))
        assertTrue(lines[0].on); assertNull(lines[0].reason); assertEquals("1000", lines[0].amount)
        assertFalse(lines[1].on); assertEquals("Already made", lines[1].reason)
        assertFalse(lines[2].on); assertEquals("That account is archived", lines[2].reason)
    }

    @Test fun totalsAreExactAndCountWhatWasAlreadyMade() {
        val lines = splitLines(plan(listOf(item("1", "1000.1000"), item("2", "2000.2000"))))
        val t = splitTotals(lines, "10000", made = "500")
        assertEquals("3000.3000", t.total)
        assertEquals("6499.7000", t.left)
        assertFalse(t.over); assertFalse(t.invalid); assertEquals(2, t.count)
        assertTrue(splitTotals(lines, "3000").over)
        assertTrue(splitTotals(lines, "3500", made = "600").over)
    }

    @Test fun anEditedAmountThatIsNotANumberIsInvalidAndAnUntickedLineIsIgnored() {
        val lines = splitLines(plan(listOf(item("1", "1000"), item("2", "500"))))
        assertTrue(splitTotals(lines.mapIndexed { i, l -> if (i == 0) l.copy(amount = "abc") else l }, "10000").invalid)
        assertTrue(splitTotals(lines.mapIndexed { i, l -> if (i == 0) l.copy(amount = "0") else l }, "10000").invalid)
        assertTrue(splitTotals(lines.mapIndexed { i, l -> if (i == 0) l.copy(amount = "1.23456") else l }, "10000").invalid)
        val unticked = lines.mapIndexed { i, l -> if (i == 0) l.copy(amount = "abc", on = false) else l }
        assertFalse(splitTotals(unticked, "10000").invalid)
        assertEquals("500.0000", splitTotals(unticked, "10000").total)
    }

    @Test fun theRequestHoldsOnlyTheTickedLines() {
        val lines = splitLines(plan(listOf(item("1", "1000.5000"), item("2", "250"))))
        val body = splitRequest(lines.mapIndexed { i, l -> if (i == 1) l.copy(on = false) else l }).toString()
        assertEquals("""{"items":[{"target_type":"account","target_id":"t-1","amount":"1000.5"}]}""", body)
    }

    @Test fun madeAndPendingAreTold() {
        val p = plan(listOf(item("1", "100", done = true), item("2", "200"), item("3", "300", ok = false)), made = listOf(SplitMade("transfer", "x", "Target 1", "100.0000"), SplitMade("entry", "y", "Goal", "50.5000")))
        assertEquals("150.50", madeTotal(p))
        assertEquals(listOf("2"), pendingLines(p).map { it.ruleId })
        assertEquals(listOf("2"), approveLines(p).map { it.key })
    }

    @Test fun ruleChecks() {
        assertNull(ruleProblem("percent", "10", true))
        assertEquals("Choose an account or a goal.", ruleProblem("percent", "10", false))
        assertEquals("Enter an amount above zero.", ruleProblem("fixed", "", true))
        assertEquals("Enter an amount above zero.", ruleProblem("fixed", "-5", true))
        assertEquals("A share can't be more than 100%.", ruleProblem("percent", "101", true))
        assertNull(ruleProblem("fixed", "1500", true))
        assertEquals("At most four decimals.", ruleProblem("fixed", "1.23456", true))
    }

    @Test fun ruleBodies() {
        assertEquals("""{"account_id":"a1","mode":"percent","value":"10","auto":true}""", createRuleJson("account", "a1", "percent", " 10 ", true).toString())
        assertEquals("""{"goal_id":"g1","mode":"fixed","value":"500","auto":false}""", createRuleJson("goal", "g1", "fixed", "500", false).toString())
        assertEquals("""{"mode":"fixed","value":"20","auto":false}""", updateRuleJson("fixed", "20", false).toString())
    }

    @Test fun onlyPostedPayInAnAccountCanBeSplit() {
        val pay = Transaction(id = "t", type = "income", amount = "10000", currency = "MVR", category = "Salary", categoryIsSalary = true, date = "2026-11-01", account = NameRef("BML Current", id = "a"))
        assertTrue(canSplitSalary(pay)); assertTrue(isSalaryToSplit(pay))
        assertFalse(canSplitSalary(pay.copy(planned = true))); assertTrue(isSalaryToSplit(pay.copy(planned = true)))
        assertFalse(canSplitSalary(pay.copy(type = "expense")))
        assertFalse(canSplitSalary(pay.copy(categoryIsSalary = false)))
        assertFalse(canSplitSalary(pay.copy(account = null)))
    }
}
