package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DashboardExtrasTest {
    private fun assertEquals(expected: Double, actual: Double) = org.junit.Assert.assertEquals(expected, actual, 1e-6)
    private fun assertEquals(expected: Double, actual: Double?) = org.junit.Assert.assertEquals(expected, actual!!, 1e-6)
    private fun cat(name: String, total: String, type: String, kind: String? = null) = CategoryTotal(name, name, "blue", total, type, 1, kind)

    @Test fun theRuleIsJudgedAgainstIncome() {
        val r = incomeRule(listOf(
            cat("Salary", "10000", "income"),
            cat("Rent", "4000", "expense", "need"), cat("Food", "1000", "expense", "need"),
            cat("Fun", "3500", "expense", "want"), cat("Odd", "500", "expense", null),
        ))!!
        assertEquals(50.0, r.rows[0].percent); assertEquals(RuleStatus.On, r.rows[0].status)      // needs 5000 of 10000
        assertEquals(35.0, r.rows[1].percent); assertEquals(RuleStatus.Over, r.rows[1].status)    // wants 3500: over 30
        assertEquals(10.0, r.rows[2].percent); assertEquals(RuleStatus.Below, r.rows[2].status)   // kept 10000 - 9000 = 1000
        assertEquals(5.0, r.unsortedPercent)
        assertEquals("50%", percentText(50.0)); assertEquals("12.5%", percentText(12.5))
        assertEquals("Up to 50%", targetText(RuleKey.Need)); assertEquals("At least 20%", targetText(RuleKey.Save))
    }

    @Test fun keptCanBeNegativeAndNoIncomeMeansNoRule() {
        val r = incomeRule(listOf(cat("Salary", "1000", "income"), cat("Rent", "1500", "expense", "need")))!!
        assertEquals(-50.0, r.rows[2].percent); assertEquals(RuleStatus.Below, r.rows[2].status); assertNull(r.unsortedAmount)
        assertNull(incomeRule(listOf(cat("Rent", "1500", "expense", "need"))))
        // exactly on a target is on target
        assertEquals(RuleStatus.On, incomeRule(listOf(cat("S", "100", "income"), cat("R", "50", "expense", "need")))!!.rows[0].status)
    }

    @Test fun theFlowAlwaysBalances() {
        val saved = moneyFlow(listOf(cat("Salary", "1000", "income"), cat("Rent", "600", "expense"), cat("Food", "100", "expense")))!!
        assertEquals(listOf("Salary", "Total", "Rent", "Food", "Saved"), saved.nodes.map { it.label })
        assertEquals(300.0, saved.nodes.last().value); assertEquals(1000.0, saved.nodes.first { it.kind == FlowKind.Total }.value)
        val over = moneyFlow(listOf(cat("Salary", "100", "income"), cat("Rent", "250", "expense")))!!
        assertEquals(150.0, over.nodes.first { it.kind == FlowKind.Deficit }.value); assertEquals(250.0, over.nodes.first { it.kind == FlowKind.Total }.value)
        assertNull(moneyFlow(emptyList()))
    }

    @Test fun theBiggestFiveAndOtherAreKept() {
        val many = (1..8).map { cat("E$it", "${it * 10}", "expense") } + cat("Salary", "1000", "income")
        val f = moneyFlow(many)!!
        val outs = f.nodes.filter { it.kind == FlowKind.Spending }
        assertEquals(6, outs.size); assertEquals("Other spending", outs.last().label); assertEquals(10.0 + 20 + 30, outs.last().value)
        // seven rows would fit under "top 5 + other": a lone sixth is shown, not hidden
        assertEquals(6, moneyFlow((1..6).map { cat("E$it", "${it * 10}", "expense") } + cat("S", "1000", "income"))!!.nodes.count { it.kind == FlowKind.Spending })
    }

    @Test fun theLayoutKeepsLinksInsideTheirNodesAndScalesAlike() {
        val f = moneyFlow(listOf(cat("Salary", "1000", "income"), cat("Rent", "600", "expense"), cat("Food", "100", "expense")))!!
        val l = layoutFlow(f, 300.0, 200.0)
        val rent = l.nodes.first { it.node.label == "Rent" }; val food = l.nodes.first { it.node.label == "Food" }
        assertTrue(rent.height > food.height * 5.5 && rent.height < food.height * 6.5)
        val toRent = l.links.first { it.link.target == "out:0" }
        assertTrue(toRent.y1 >= rent.y && toRent.y1 <= rent.y + rent.height)
        assertEquals(toRent.thickness, rent.height, 0.001)
        assertNotNull(l.links.firstOrNull { it.link.source == "in:0" })
    }

    @Test fun labelsAreSpreadApartAndKeptInside() {
        assertEquals(listOf(10.0, 40.0, 70.0), spreadLabels(listOf(10.0, 11.0, 12.0), 30.0, 200.0))
        assertEquals(listOf(140.0, 170.0, 200.0), spreadLabels(listOf(190.0, 195.0, 200.0), 30.0, 200.0))
        assertEquals(listOf(50.0, 150.0), spreadLabels(listOf(50.0, 150.0), 30.0, 200.0))
    }

    @Test fun keptIsIncomeLessExpensesAndRunsOn() {
        val rows = netRows(listOf(MonthlyPoint("2026-09", "1000", "800"), MonthlyPoint("2026-10", "500", "900"), MonthlyPoint("2026-11", "1000", "-50")))
        assertEquals(listOf("200", "-400", "1050"), rows.map { it.kept.stripTrailingZeros().toPlainString() })
        assertEquals(listOf("200", "-200", "850"), rows.map { it.running.stripTrailingZeros().toPlainString() })
        assertEquals(listOf("2026-10", "2026-11"), lastMonths(listOf(MonthlyPoint("2026-09", "0", "0"), MonthlyPoint("2026-10", "0", "0"), MonthlyPoint("2026-11", "0", "0")), 2).map { it.month })
        org.junit.Assert.assertEquals("Nov", monthShort("2026-11"))
    }
}

class RateLogicTest {
    @Test fun aSeriesIsSummarised() {
        val s = summarizeRates(listOf(RatePoint("2026-10-01", "15.40"), RatePoint("2026-10-15", "15.10"), RatePoint("2026-11-01", "15.50")))!!
        org.junit.Assert.assertEquals(15.4, s.first, 1e-9); org.junit.Assert.assertEquals(15.5, s.last, 1e-9)
        org.junit.Assert.assertEquals(15.1, s.low, 1e-9); org.junit.Assert.assertEquals(15.5, s.high, 1e-9)
        org.junit.Assert.assertEquals(0.649, s.change, 0.001)
        org.junit.Assert.assertNull(summarizeRates(emptyList()))
    }

    @Test fun ratesAndChangesAreWrittenPlainly() {
        org.junit.Assert.assertEquals("15.4", formatRate(15.4)); org.junit.Assert.assertEquals("15.4123", formatRate(15.41234)); org.junit.Assert.assertEquals("0.0652", formatRate(0.06523))
        org.junit.Assert.assertEquals("+1.2%", changeText(1.24)); org.junit.Assert.assertEquals("-0.4%", changeText(-0.42)); org.junit.Assert.assertEquals("0.0%", changeText(0.0)); org.junit.Assert.assertEquals("0.0%", changeText(-0.02))
    }
}
