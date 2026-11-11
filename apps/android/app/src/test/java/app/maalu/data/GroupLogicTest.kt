package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GroupLogicTest {
    private fun tx(type: String = "expense", adjustment: Boolean = false, group: NameRef? = null) =
        Transaction(id = "t", type = type, amount = "10", currency = "MVR", category = "Food", date = "2026-11-01", adjustment = adjustment, group = group)

    @Test fun sizeRules() {
        assertEquals("Choose at least 2 transactions to make a group.", groupSizeProblem(1))
        assertNull(groupSizeProblem(2)); assertNull(groupSizeProblem(50))
        assertEquals("A group holds at most 50 transactions.", groupSizeProblem(51))
    }

    @Test fun datesAndLines() {
        assertEquals("1 Mar 2026", dateSpan("2026-03-01", "2026-03-01"))
        assertEquals("1 Mar 2026 – 9 Mar 2026", dateSpan("2026-03-01", "2026-03-09"))
        assertEquals("", dateSpan(null, null))
        assertEquals("3 transactions · 1 Mar 2026 – 9 Mar 2026", groupLine(3, "2026-03-01", "2026-03-09"))
        assertEquals("1 transaction", groupLine(1, null, null))
    }

    @Test fun messages() {
        assertEquals("Made \"Trip\" from 3 transactions.", groupedMessage(3, "Trip", true))
        assertEquals("Added 1 transaction to \"Trip\".", groupedMessage(1, "Trip", false))
        assertEquals("Removed 2 transactions from \"Trip\".", removedMessage(GroupRemoved(2, false), "Trip"))
        assertEquals("Removed 1 transaction. \"Trip\" needs two, so it was deleted.", removedMessage(GroupRemoved(1, true), "Trip"))
    }

    @Test fun whatCanBeGrouped() {
        assertTrue(canGroup(tx())); assertTrue(canGroup(tx("income")))
        assertFalse(canGroup(tx("transfer"))); assertFalse(canGroup(tx(adjustment = true)))
        assertFalse(canGroup(tx(group = NameRef("Trip", id = "g"))))
        assertEquals("Already in Trip", cannotGroupReason(tx(group = NameRef("Trip", id = "g"))))
        assertNull(cannotGroupReason(tx()))
    }

    @Test fun bodies() {
        assertEquals("""{"name":"Trip","note":"to Male","transaction_ids":["a","b"]}""", createGroupJson(" Trip ", " to Male ", listOf("a", "b")).toString())
        assertEquals("""{"name":"Trip","transaction_ids":["a","b"]}""", createGroupJson("Trip", " ", listOf("a", "b")).toString())
        assertEquals("""{"transaction_ids":["a"]}""", memberJson(listOf("a")).toString())
        assertEquals("""{"name":"New","note":null}""", updateGroupJson("New ", "").toString())
        assertEquals("""{"name":"New","note":"x"}""", updateGroupJson("New", "x").toString())
        assertNull(groupNameProblem("Trip")); assertEquals("Give the group a name.", groupNameProblem(" "))
        assertTrue(isNegative("-5.0000")); assertFalse(isNegative("0")); assertFalse(isNegative("12"))
    }
}
