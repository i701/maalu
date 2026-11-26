package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SpendingStackLogicTest {
    private fun row(name: String, vararg amounts: String, type: String = "expense") = CategoryMonthRow(type, name, name, "blue", amounts = amounts.toList())

    private val data = CategoryMonths(
        "MVR", listOf("2026-09", "2026-10", "2026-11"),
        listOf(row("Rent", "900", "100", "100"), row("Food", "0", "50", "60"), row("Fun", "0", "-5", "10"), row("Pay", "999", "999", "999", type = "income")),
    )

    @Test fun ranksOverTheMonthsShownAndFoldsTheRest() {
        val s = spendingStack(data, 2, top = 1)!!
        assertEquals(listOf("Rent", "Other"), s.names)
        assertEquals(listOf("2026-10", "2026-11"), s.months.map { it.month })
        // the refund month counts as nothing for Fun, not as less
        assertEquals("150", s.months[0].total.toPlainString())
        assertEquals("120", s.total("Other").toPlainString())
    }

    @Test fun theFigureFollowsWhatIsPicked() {
        val s = spendingStack(data, 2, top = 2)!!
        assertEquals("320", s.amount(null, null).toPlainString())
        assertEquals("110", s.amount(null, "Food").toPlainString())
        assertEquals("170", s.amount(s.months[1], null).toPlainString())
        assertEquals("60", s.amount(s.months[1], "Food").toPlainString())
    }

    @Test fun nothingSpentIsNoCard() {
        assertNull(spendingStack(CategoryMonths("MVR", listOf("2026-11"), listOf(row("Pay", "1", type = "income"))), 6))
    }
}
