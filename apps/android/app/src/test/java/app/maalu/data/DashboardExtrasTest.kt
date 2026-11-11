package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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

class SplitLogicTest {
    private fun row(name: String = "Rice", qty: String = "2", price: String = "15", category: String = "Groceries") = ItemRow("k$name", name, qty, price, category)
    private fun n(v: java.math.BigDecimal?) = v?.stripTrailingZeros()?.toPlainString()

    @Test fun aLineIsQuantityTimesPrice() {
        assertEquals("30", n(lineAmount(row(), TaxMode.None, "")!!.amount)); assertNull(lineAmount(row(price = ""), TaxMode.None, ""))
        assertNull(lineAmount(row(qty = "0"), TaxMode.None, "")); assertNull(lineAmount(row(price = "abc"), TaxMode.None, ""))
        assertEquals("7.5", n(lineAmount(row(qty = "0.5", price = "15"), TaxMode.None, "")!!.amount))
    }

    @Test fun gstIncludedOrExcluded() {
        val inc = lineAmount(row(qty = "1", price = "108"), TaxMode.Included, "8")!!
        assertEquals("108", n(inc.amount)); assertEquals("8", n(inc.tax))
        val exc = lineAmount(row(qty = "1", price = "100"), TaxMode.Excluded, "8")!!
        assertEquals("108", n(exc.amount)); assertEquals("8", n(exc.tax))
        assertNull(lineAmount(row(), TaxMode.Included, ""))                       // a rate is needed
        assertEquals("30", n(lineAmount(row(), TaxMode.Included, "0")!!.amount))  // a rate of 0 is no tax
    }

    @Test fun aSavedRowKeepsItsExactTotalUntilEdited() {
        val rows = rowsFromSplits(listOf(PurchaseItem("i", "Rice", "3", "Groceries", "10.0000", "0.7407")))
        assertEquals("3.3333", rows[0].price); assertEquals("3", rows[0].quantity)
        assertEquals("10", n(lineAmount(rows[0], TaxMode.None, "")!!.amount)); assertEquals("0.7407", n(lineAmount(rows[0], TaxMode.None, "")!!.tax))
        assertEquals("7.5", n(lineAmount(rows[0].copy(lockedAmount = null, lockedTax = null, price = "2.5"), TaxMode.None, "")!!.amount))
    }

    @Test fun theFormsItemsMakeTheAmountAndTheRequest() {
        val f = AddForm(type = "expense", amount = "999", accountId = "a", splitOn = true, items = listOf(row(), row("Soap", "1", "12.50", "Health")))
        assertEquals("42.5", n(f.effectiveAmount().toBigDecimal())); assertNull(f.itemsProblem())
        assertEquals("999", AddForm(amount = "999").effectiveAmount())
        val body = f.toJson(emptyList(), "MVR")
        assertEquals("42.5", n(body["amount"]!!.toString().trim('"').toBigDecimal())); assertTrue(body.containsKey("splits")); assertFalse(body.containsKey("category"))
        assertEquals(2, (body["splits"] as kotlinx.serialization.json.JsonArray).size)
    }

    @Test fun theTaxGoesWithTheItemOrIsExplicitlyNull() {
        val saved = rowsFromSplits(listOf(PurchaseItem("i", "Rice", "2", "Groceries", "40.0000", "2.9600"), PurchaseItem("j", "Soap", "1", "Health", "18.0000", null)))
        val sent = AddForm(splitOn = true, items = saved).splitsJson()
        assertEquals("2.9600", (sent[0] as kotlinx.serialization.json.JsonObject)["tax_amount"]!!.toString().trim('"'))
        assertEquals(kotlinx.serialization.json.JsonNull, (sent[1] as kotlinx.serialization.json.JsonObject)["tax_amount"])
    }

    @Test fun whatIsWrongWithItems() {
        fun f(vararg r: ItemRow, mode: TaxMode = TaxMode.None, rate: String = "") = AddForm(splitOn = true, items = r.toList(), taxMode = mode, taxRate = rate)
        assertNotNull(f().itemsProblem())                                                  // no items
        assertEquals("Item 1 needs a name.", f(row(name = "")).itemsProblem())
        assertEquals("Rice needs a category.", f(row(category = "")).itemsProblem())
        assertEquals("Rice needs a quantity and a price.", f(row(price = "")).itemsProblem())
        assertEquals("Enter the GST rate, for example 8.", f(row(), mode = TaxMode.Included).itemsProblem())
        assertNull(f(row(), mode = TaxMode.Included, rate = "8").itemsProblem())
    }

    @Test fun editingASplitSendsItsItemsOnlyWhenTheyChange() {
        val saved = AddForm(type = "expense", amount = "30", splitOn = true, items = listOf(row()), category = "Groceries")
        assertFalse(saved.patchJson(saved, emptyList(), "MVR").containsKey("splits"))
        val edited = saved.copy(items = listOf(row(price = "20")))
        val patch = edited.patchJson(saved, emptyList(), "MVR")
        assertTrue(patch.containsKey("splits")); assertEquals("40", n(patch["amount"]!!.toString().trim('"').toBigDecimal()))
        // turning the items off removes them and sends the amount and category again
        val off = saved.copy(splitOn = false, amount = "30", category = "Groceries").patchJson(saved, emptyList(), "MVR")
        assertEquals(kotlinx.serialization.json.JsonNull, off["splits"]); assertTrue(off.containsKey("category"))
        // turning them on for a plain purchase sends the total with them
        assertTrue(AddForm(type = "expense", amount = "5", category = "X").copy(splitOn = true, items = listOf(row())).patchJson(AddForm(type = "expense", amount = "5", category = "X"), emptyList(), "MVR").containsKey("splits"))
    }
}
