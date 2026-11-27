package app.maalu.data

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FormDetailsTest {
    @Test fun aNewFormHasNothingToOpen() {
        assertFalse(AddForm().hasDetails())
        assertTrue(AddForm(note = "lunch").hasDetails())
        assertTrue(AddForm(methodTouched = true).hasDetails())
        // a transfer shows no tags or card, so leftovers from another type do not count
        assertFalse(AddForm(type = "transfer", tags = listOf("trip"), cardId = "c").hasDetails())
    }

    @Test fun theSummaryNamesWhatIsChosen() {
        val form = AddForm(method = "cash", planned = true, tags = listOf("a", "b"), note = "x")
        assertEquals("Cash · Planned · 2 tags · Note", form.detailsSummary(null))
        assertEquals("", AddForm(type = "transfer").detailsSummary("Visa"))
    }

    @Test fun nearDatesAreSaidInWords() {
        val today = LocalDate.of(2026, 11, 27)
        assertEquals("Today", dateLabel("2026-11-27", today))
        assertEquals("Yesterday", dateLabel("2026-11-26", today))
        assertEquals("Tomorrow", dateLabel("2026-11-28", today))
        assertEquals(shortDate("2026-11-02"), dateLabel("2026-11-02", today))
    }
}
