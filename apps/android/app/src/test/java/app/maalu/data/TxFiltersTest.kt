package app.maalu.data

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TxFiltersTest {
    @Test fun nothingChosenSendsNothing() {
        assertTrue(TxFilters().query().isEmpty())
        assertFalse(TxFilters().isFiltered())
    }

    @Test fun everyFilterBecomesItsParameter() {
        val f = TxFilters(
            type = "expense", dateFrom = "2026-11-01", dateTo = "2026-11-30",
            account = Ref("a1", "BML"), category = Ref("c1", "Food"),
            tags = listOf(Ref("t1", "x"), Ref("t2", "y")), tagMatch = "all",
            method = "cash", kind = "need", min = "10", max = "99.50",
        )
        val q = f.query()
        assertEquals("expense", q["type"])
        assertEquals("a1", q["account_id"])
        assertEquals(listOf("t1", "t2"), q["tag_id"])
        assertEquals("all", q["tag_match"])
        assertEquals("10", q["min_amount"])
        assertEquals("99.50", q["max_amount"])
        assertEquals(8, f.detailCount()) // type is a quick chip, so it is not counted
    }

    @Test fun badAmountsAreLeftOut() {
        val q = TxFilters(min = "abc", max = "-5").query()
        assertFalse(q.containsKey("min_amount"))
        assertFalse(q.containsKey("max_amount"))
    }

    @Test fun clearingKeepsTheQuickChips() {
        val cleared = TxFilters(type = "income", planned = false, account = Ref("a", "A"), min = "5").clearDetails()
        assertEquals("income", cleared.type)
        assertEquals(0, cleared.detailCount())
    }

    @Test fun presetsGiveWholeRanges() {
        val today = LocalDate.of(2026, 11, 10)
        assertEquals("2026-11-01" to "2026-11-30", presetRange(DatePreset.ThisMonth, today))
        assertEquals("2026-10-01" to "2026-10-31", presetRange(DatePreset.LastMonth, today))
        assertEquals("2026-10-12" to "2026-11-10", presetRange(DatePreset.Last30, today))
        assertEquals("2026-01-01" to "2026-11-10", presetRange(DatePreset.ThisYear, today))
    }

    @Test fun savedFiltersComeBack() {
        val f = TxFilters(type = "expense", account = Ref("a", "BML"), tags = listOf(Ref("t", "x")))
        assertEquals(f, txFiltersFromJson(f.toJson()))
        assertEquals(TxFilters(), txFiltersFromJson("not json"))
    }

    @Test fun aCardFilterIsSentAndCounted() {
        val f = TxFilters(card = Ref("c1", "MIB Visa ••2815"))
        assertEquals("c1", f.query()["card_id"]); assertEquals(1, f.detailCount()); assertTrue(f.isFiltered())
        assertNull(f.clearDetails().card)
    }
}
