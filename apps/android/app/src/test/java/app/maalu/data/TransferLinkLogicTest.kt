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

    @Test fun theSameAmountComesFirstAndFarAwayEntriesAreLeftOut() {
        val base = tx("e", "expense", "bml", "50", "2026-11-11")
        val same = tx("i1", "income", "mib", "50", "2026-11-12")
        val sameOld = tx("i5", "income", "mib", "50", "2026-09-01")      // the same amount is always offered, however old
        val nearer = tx("i2", "income", "mib", "75", "2026-11-11")
        val otherCurrency = tx("i3", "income", "mib", "50", "2026-11-10", currency = "USD")
        val sameAccount = tx("i4", "income", "bml", "50")
        val salary = tx("i6", "income", "mib", "10000", "2026-10-01")    // 41 days away, a different amount: not offered
        val tenDays = tx("i7", "income", "mib", "10000", "2026-11-01")   // 10 days away: offered, after the near ones
        val g = counterpartGroups(base, listOf(nearer, otherCurrency, sameAccount, same, salary, sameOld, tenDays))
        assertEquals(listOf("i1", "i5"), g.sameAmount.map { it.id })
        assertEquals(listOf("i2", "i3", "i7"), g.others.map { it.id })
        // searching lifts the date limit
        assertEquals(listOf("i2", "i3", "i7", "i6"), counterpartGroups(base, listOf(nearer, otherCurrency, salary, tenDays), searching = true).others.map { it.id }.let { it })
        assertTrue(counterpartGroups(base, emptyList()).isEmpty)
    }

    @Test fun wordsAndBodies() {
        assertEquals("same day", daysApartText(0)); assertEquals("1 day apart", daysApartText(1)); assertEquals("2 days apart", daysApartText(2))
        assertEquals("""{"expense_id":"e","income_id":"i"}""", pairJson("e", "i").toString())
        assertTrue(linkSentence(tx("e", "expense", "bml").copy(account = NameRef("BML", id = "bml")), tx("i", "income", "mib").copy(account = NameRef("MIB", id = "mib"))).startsWith("Move MVR 50.00 from BML to MIB? The expense becomes the transfer"))
        assertTrue(linkSentence(tx("e", "expense", "bml", currency = "MVR"), tx("i", "income", "mib", "3.2", currency = "USD")).contains("arriving as USD 3.20"))
    }
}
