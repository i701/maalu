package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TransferLinkLogicTest {
    private fun tx(id: String, type: String, account: String, amount: String = "50", date: String = "2026-11-11", currency: String = "MVR", planned: Boolean = false, adjustment: Boolean = false, refunded: String = "0", splits: Int = 0) =
        Transaction(
            id = id, type = type, amount = amount, currency = currency, category = "Other", date = date, planned = planned, adjustment = adjustment,
            account = NameRef(account, id = account), refundedAmount = refunded, splits = List(splits) { kotlinx.serialization.json.JsonNull },
        )

    @Test fun whichEntriesCanBeASide() {
        assertTrue(canBeExpenseSide(tx("e", "expense", "bml"))); assertTrue(canBeIncomeSide(tx("i", "income", "mib")))
        assertFalse(canBeExpenseSide(tx("e", "expense", "bml", planned = true))); assertFalse(canBeExpenseSide(tx("e", "expense", "bml", adjustment = true)))
        assertFalse(canBeExpenseSide(tx("e", "expense", "bml", splits = 2))); assertFalse(canBeExpenseSide(tx("e", "expense", "bml", refunded = "10")))
        assertFalse(canBeIncomeSide(tx("i", "income", "mib", planned = true))); assertFalse(canBeExpenseSide(tx("t", "transfer", "bml")))
        assertFalse(canBeExpenseSide(tx("e", "expense", "bml").copy(account = null)))
        assertTrue(canLinkAsTransfer(tx("i", "income", "mib"))); assertFalse(canLinkAsTransfer(tx("t", "transfer", "mib")))
    }

    @Test fun aCounterpartIsTheOppositeSideInAnotherAccount() {
        val e = tx("e", "expense", "bml"); val i = tx("i", "income", "mib")
        assertTrue(isCounterpart(e, i)); assertTrue(isCounterpart(i, e))
        assertFalse(isCounterpart(e, tx("i2", "income", "bml")))   // the same account
        assertFalse(isCounterpart(e, tx("e2", "expense", "mib")))  // the same side
        assertEquals(e to i, pairOf(i, e)); assertEquals(e to i, pairOf(e, i))
        assertNull(pairOf(e, tx("e2", "expense", "mib")))
    }

    @Test fun onlyTheExactSameAmountIsOffered() {
        val base = tx("e", "expense", "bml", "50", "2026-11-11")
        val near = tx("i1", "income", "mib", "50", "2026-11-12")
        val old = tx("i2", "income", "mib", "50.00", "2026-09-01")
        val g = counterpartGroups(base, listOf(
            old, near, tx("i3", "income", "mib", "75"), tx("i4", "income", "mib", "10000", "2026-11-01"),
            tx("i5", "income", "mib", "3.2", currency = "USD").copy(baseAmount = "49.40"), tx("i6", "income", "bml", "50"),
        ))
        assertEquals(listOf("i1", "i2"), g.sameAmount.map { it.id })
        assertTrue(counterpartGroups(base, emptyList()).isEmpty)
    }

    @Test fun wordsAndBodies() {
        assertEquals("same day", daysApartText(0)); assertEquals("1 day apart", daysApartText(1)); assertEquals("2 days apart", daysApartText(2))
        assertEquals("""{"expense_id":"e","income_id":"i"}""", pairJson("e", "i").toString())
        assertTrue(linkSentence(tx("e", "expense", "bml").copy(account = NameRef("BML", id = "bml")), tx("i", "income", "mib").copy(account = NameRef("MIB", id = "mib"))).startsWith("Move MVR 50.00 from BML to MIB? The expense becomes the transfer"))
        assertTrue(linkSentence(tx("e", "expense", "bml", currency = "MVR"), tx("i", "income", "mib", "3.2", currency = "USD")).contains("arriving as USD 3.20"))
    }
}
