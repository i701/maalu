package app.maalu.data

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TransactionLogicTest {
    private val today = LocalDate.of(2026, 11, 10)

    @Test fun dayLabelsAreFriendly() {
        assertEquals("Today", dayLabel("2026-11-10", today))
        assertEquals("Yesterday", dayLabel("2026-11-09", today))
        assertEquals("Tomorrow", dayLabel("2026-11-11", today))
        assertEquals("Thu 5 Nov", dayLabel("2026-11-05", today))
        assertEquals("Wed 31 Dec 2025", dayLabel("2025-12-31", today))
    }

    @Test fun timeLosesItsSeconds() {
        assertEquals("14:32", shortTime("14:32:00"))
        assertNull(shortTime(null))
    }

    @Test fun groupsKeepTheServersOrder() {
        fun t(id: String, date: String) = Transaction(id, "expense", "1", "MVR", "X", date = date)
        val groups = groupByDay(listOf(t("a", "2026-11-10"), t("b", "2026-11-10"), t("c", "2026-11-09")))
        assertEquals(listOf("2026-11-10", "2026-11-09"), groups.map { it.first })
        assertEquals(listOf("a", "b"), groups.first().second.map { it.id })
    }

    @Test fun refundsAreRecognisedByTheirLink() {
        val plain = Transaction("1", "income", "1", "MVR", "X", date = "2026-11-10")
        assertFalse(plain.isRefund)
        val refund = plain.copy(refundOf = AppJson.parseToJsonElement("""{"id":"x"}"""))
        assertTrue(refund.isRefund)
    }
}
