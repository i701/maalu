package app.maalu.data

import java.math.BigDecimal
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CategorySpendLogicTest {
    private fun total(id: String, amount: String, parent: String? = null, type: String = "expense") =
        CategoryTotal(category = id, categoryId = id, color = "blue", total = amount, type = type, parentId = parent)

    @Test fun aParentIncludesItsSubCategories() {
        val totals = listOf(total("food", "100.50"), total("dining", "800", "food"), total("pay", "999", type = "income"))
        val spend = spendByCategory(totals)
        assertEquals(CategorySpend(BigDecimal("900.50"), true), spend["food"])
        assertEquals(CategorySpend(BigDecimal("800"), false), spend["dining"])
        assertNull(spend["pay"])
        assertEquals(BigDecimal("900.50"), totalSpent(totals))
    }

    @Test fun aParentWithNothingOfItsOwnStillHasAFigure() {
        assertEquals(CategorySpend(BigDecimal("800"), true), spendByCategory(listOf(total("dining", "800", "food")))["food"])
    }

    private fun line(id: String, category: String) = BudgetLine(
        id = id, name = id, activity = "50", amount = "100", available = "50", percent = 50, status = "ok",
        carried = "20", movedIn = "5", movedOut = "10", categories = listOf(IdName(category, category)),
    )

    private fun fixed(id: String, category: String, start: String, end: String) = FixedLine(
        id = id, name = id, activity = "1", amount = "10", available = "9", percent = 10, status = "ok",
        startDate = start, endDate = end, categories = listOf(IdName(category, category)),
    )

    private val budget = Budget(
        currency = "MVR", period = BudgetPeriod("2026-11-01", "2026-11-30"),
        totals = BudgetTotals("0", "0", "0", 0, "ok"),
        lines = listOf(line("food-limit", "food")),
        fixedLines = listOf(fixed("old", "gifts", "2026-01-01", "2026-01-31"), fixed("trip", "dining", "2026-11-10", "2026-12-10")),
    )

    @Test fun aCategoryTakesItsOwnLimitThenItsParents() {
        assertEquals("trip", limitFor(budget, "dining", "food")?.id)
        assertEquals("food-limit", limitFor(budget, "coffee", "food")?.id)
        assertNull(limitFor(budget, "rent", null))
        // outside the period shown
        assertNull(limitFor(budget, "gifts", null))
    }

    @Test fun theTotalCountsCarryAndMovesAndThePlaceCountsEveryLimit() {
        assertEquals(BigDecimal("115"), limitFor(budget, "food", null)?.total)
        assertEquals(2, limitFor(budget, "dining", null)?.place)
    }

    @Test fun anotherMonthIsAskedAboutMidMonth() {
        val today = LocalDate.of(2026, 11, 27)
        assertEquals(today, budgetDay(LocalDate.of(2026, 11, 1), today))
        assertEquals(LocalDate.of(2026, 10, 15), budgetDay(LocalDate.of(2026, 10, 1), today))
    }
}
