package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class ReportsLogicTest {
    private val today = LocalDate.of(2026, 11, 11)
    private fun cat(id: String, name: String, total: String, type: String = "expense") = CategoryTotal(name, id, "blue", total, type)
    private val money = { a: String -> "MVR $a" }

    @Test fun presetsMakeTwoPeriodsOfTheSameKind() {
        val last = periodsFor(ComparePreset.LastMonth, today)
        assertEquals(LocalDate.of(2026, 10, 1), last.now.from); assertEquals(LocalDate.of(2026, 10, 31), last.now.to)
        assertEquals(LocalDate.of(2026, 9, 1), last.before.from); assertEquals(LocalDate.of(2026, 9, 30), last.before.to)
        assertEquals("October 2026", last.now.label)
        val this_ = periodsFor(ComparePreset.ThisMonth, today)
        assertEquals(LocalDate.of(2026, 11, 30), this_.now.to)
        val l30 = periodsFor(ComparePreset.Last30, today)
        assertEquals(LocalDate.of(2026, 10, 13), l30.now.from); assertEquals(LocalDate.of(2026, 10, 12), l30.before.to)
        val year = periodsFor(ComparePreset.ThisYear, today)
        assertEquals(LocalDate.of(2025, 11, 11), year.before.to); assertEquals("2026 so far", year.now.label)
        // 29 February has no twin the year after
        assertEquals(LocalDate.of(2027, 2, 28), sameDayYearsAgo(LocalDate.of(2028, 2, 29), 1))
    }

    @Test fun rowsLineUpByCategoryAndSortByTheBiggestMove() {
        val before = listOf(cat("a", "Food", "100"), cat("b", "Gone", "40"), cat("c", "Rent", "1000"))
        val now = listOf(cat("a", "Food", "250.50"), cat("c", "Rent", "1000"), cat("d", "New", "30"))
        val rows = compareRows(before, now, "expense")
        assertEquals(listOf("Food", "Gone", "New", "Rent"), rows.map { it.category })
        assertEquals("150.50", rows[0].change.change); assertEquals("both", rows[0].state)
        assertEquals("gone", rows[1].state); assertEquals("new", rows[2].state)
        assertNull(rows[2].change.percent) // nothing before to measure against
        assertEquals(150.5, rows[0].change.percent!!, 0.0) // 150.5 on 100
    }

    @Test fun totalsAddUpExactlyAndKeptIsIncomeLessSpending() {
        val before = listOf(cat("a", "Food", "100.10"), cat("s", "Salary", "1000", "income"))
        val now = listOf(cat("a", "Food", "0.20"), cat("b", "Fun", "50"), cat("s", "Salary", "1000", "income"))
        val t = compareTotals(before, now)
        assertEquals("50.20", t.expense.now); assertEquals("-49.90", t.expense.change)
        assertEquals("899.90", t.kept.before); assertEquals("949.80", t.kept.now)
    }

    @Test fun theSentenceNamesOnlyCategoriesThatMovedTheSameWay() {
        val rows = compareRows(listOf(cat("a", "Food", "100"), cat("b", "Fun", "300")), listOf(cat("a", "Food", "400"), cat("b", "Fun", "250")), "expense")
        val e = changeOf("400", "650")
        assertEquals("Spending is up MVR 250 (63%) on September 2026. Most of it: Food +MVR 300.", spendingSentence(e, rows, "September 2026", money))
        assertEquals("There is no spending in either period.", spendingSentence(changeOf("0", "0"), emptyList(), "x", money))
        assertEquals("Spending is the same as in x.", spendingSentence(changeOf("5", "5"), emptyList(), "x", money))
    }

    @Test fun trendsRangesAndColumns() {
        val (from, to) = trendBounds(12, today)
        assertEquals(LocalDate.of(2025, 12, 1), from); assertEquals(LocalDate.of(2026, 11, 30), to)
        assertEquals("Mar 26", monthColumn("2026-03")); assertEquals("Dec 25", monthColumn("2025-12"))
        val rows = listOf(
            CategoryMonthRow("expense", "a", "Food", "blue", amounts = listOf("10.10", "0", "30"), total = "40.10"),
            CategoryMonthRow("expense", "b", "Fun", "pink", amounts = listOf("0.20", "-5", "0"), total = "-4.80"),
        )
        assertEquals(listOf("10.30", "-5", "30"), columnTotals(rows, 3))
        assertEquals(30.0, maxCell(rows), 0.0)
        assertEquals(1f, heat("30", 30.0), 0f); assertEquals(0.5f, heat("15", 30.0), 0f)
        assertEquals(0f, heat("-5", 30.0), 0f); assertEquals(0f, heat("0", 30.0), 0f)
        assertEquals("13.37", monthlyAverage(rows[0]))
        assertEquals("–", cellText("0")); assertEquals("12.50", cellText("12.5")); assertEquals("1,234", cellText("1234.4")); assertEquals("-5.00", cellText("-5"))
    }

    private fun drivers(vararg p: Pair<String, String>) = p.map { NetWorthDriver(it.first, it.second) }
    private fun nw(change: String, vararg p: Pair<String, String>) = NetWorthDrivers("MVR", "2026-10-13", "2026-11-11", "10000", (10000 + change.toInt()).toString(), change, drivers(*p))

    @Test fun netWorthPeriodsEndToday() {
        assertEquals(LocalDate.of(2026, 10, 13) to today, netPeriod(NetPeriod.Last30, today))
        assertEquals(LocalDate.of(2026, 1, 1) to today, netPeriod(NetPeriod.ThisYear, today))
        assertEquals(today.minusDays(364) to today, netPeriod(NetPeriod.Last365, today))
    }

    @Test fun driverBarsSkipZeroAndScaleToTheBiggest() {
        val bars = driverBars(drivers("income" to "5000", "spending" to "-2500", "adjustments" to "0", "exchange_rates" to "0"))
        assertEquals(listOf("income", "spending"), bars.map { it.key })
        assertEquals(1f, bars[0].fraction, 0f); assertEquals(0.5f, bars[1].fraction, 0f)
        assertEquals("Income", bars[0].label)
        assertTrue(driverBars(drivers("income" to "0")).isEmpty())
    }

    @Test fun netWorthSentences() {
        val d = nw("1500", "income" to "5000", "spending" to "-3000", "adjustments" to "-500")
        assertEquals(
            "Net worth rose MVR 1500 (15.0%), from MVR 10000 to MVR 11500. You kept MVR 2000 (income less spending). Balance adjustments took MVR 500.",
            netWorthSentence(d, money),
        )
        assertEquals("Net worth stayed at MVR 10000.", netWorthSentence(nw("0", "income" to "0"), money))
        assertEquals(
            "Net worth fell MVR 800 (8.0%), from MVR 10000 to MVR 9200. You spent MVR 800 more than you earned.",
            netWorthSentence(nw("-800", "income" to "200", "spending" to "-1000"), money),
        )
        assertNull(changePercent("0", "100"))
    }
}
