package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SummaryLogicTest {
    @Test fun aShareStaysWithinTheWhole() {
        assertEquals(0.25f, shareOf("25".toBigDecimal(), "100".toBigDecimal()))
        // spending above the income leaves nothing kept
        assertEquals(1f, shareOf("150".toBigDecimal(), "100".toBigDecimal()))
        assertNull(shareOf("5".toBigDecimal(), "0".toBigDecimal()))
    }

    @Test fun theChangeIsSaidInWords() {
        assertEquals("Up 50% on last month", spendingChangeText("150", "100"))
        assertEquals("Down 32% on last month", spendingChangeText("68", "100"))
        assertEquals("Same as last month", spendingChangeText("100.2", "100"))
        assertNull(spendingChangeText("10", "0"))
    }

    @Test fun whatIsOwedCountsAsHeld() {
        fun account(id: String, group: String, balance: String) = Account(id, id, group, "MVR", balance, balance)
        val held = heldByGroup(listOf(account("a", "accounts", "100"), account("c", "card", "-40"), account("b", "accounts", "5")))
        assertEquals(listOf("accounts" to "105", "card" to "40"), held.map { it.first to it.second.toPlainString() })
    }
}
