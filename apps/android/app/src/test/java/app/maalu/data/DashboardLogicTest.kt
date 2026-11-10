package app.maalu.data

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DashboardLogicTest {
    @Test fun monthBoundsCoverTheCalendarMonth() {
        assertEquals(LocalDate.of(2026, 10, 1) to LocalDate.of(2026, 10, 31), monthBounds(LocalDate.of(2026, 10, 17)))
        assertEquals(LocalDate.of(2028, 2, 1) to LocalDate.of(2028, 2, 29), monthBounds(LocalDate.of(2028, 2, 3)))
    }

    @Test fun percentChangeNeedsSomethingToCompareWith() {
        assertEquals(50.0, percentChange("150", "100")!!, 0.0001)
        assertNull(percentChange("10", "0"))
        assertNull(percentChange("10", "-5"))
    }

    @Test fun keptIsExact() {
        assertEquals("0.3", kept("0.4", "0.1"))
        assertEquals("-50", kept("100", "150"))
    }

    @Test fun spendingFoldsTheRestIntoOther() {
        val cats = (1..8).map { CategoryTotal("c$it", "$it", "blue", "${it * 10}", "expense") } +
            CategoryTotal("Pay", "x", "green", "999", "income")
        val rows = spendingRows(cats, top = 6)
        assertEquals(7, rows.size)
        assertEquals("c8", rows.first().name)
        assertEquals("Other", rows.last().name)
        assertEquals(1.0, rows.sumOf { it.share }, 0.0001)
    }

    @Test fun shortMoneyUsesFullFiguresBelowTenThousand() {
        assertEquals("MVR 9,999.00", formatMoneyShort("9999", "MVR"))
        assertEquals("MVR 513.58M", formatMoneyShort("513580000", "MVR"))
        assertEquals("-MVR 12.5K", formatMoneyShort("-12500", "MVR"))
    }

    @Test fun kindSharesSplitSpendingAndIgnoreIncome() {
        val cats = listOf(
            CategoryTotal("Rent", "1", "orange", "300", "expense", kind = "need"),
            CategoryTotal("Cinema", "2", "pink", "100", "expense", kind = "want"),
            CategoryTotal("Misc", "3", "slate", "100", "expense"),
            CategoryTotal("Pay", "4", "green", "9999", "income", kind = "need"),
        )
        val shares = kindShares(cats)!!
        assertEquals(listOf(0.6, 0.2, 0.2), shares.map { it.share })
        assertNull(kindShares(emptyList()))
    }

    @Test fun transactionTitlePrefersDescriptionThenVendorThenCategory() {
        val base = Transaction("1", "expense", "5", "MVR", "Dining", date = "2026-11-10")
        assertEquals("Dining", base.title())
        assertEquals("Ensis", base.copy(vendor = NameRef("Ensis")).title())
        assertEquals("Lunch", base.copy(vendor = NameRef("Ensis"), description = "Lunch").title())
        assertEquals("A → B", base.copy(type = "transfer", account = NameRef("A"), toAccount = NameRef("B")).title())
    }
}
