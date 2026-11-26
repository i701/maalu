package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TransferSlabLogicTest {
    private fun account(id: String, currency: String = "MVR", rate: String = "1") =
        Account(id, id, "accounts", currency, "0", "0", exchangeRate = rate)

    private val a = account("a")
    private val b = account("b")
    private val usd = account("usd", "USD", "15.42")
    private val all = listOf(a, b, usd)
    private val form = AddForm(type = "transfer", accountId = "a", toAccountId = "b", amount = "100")

    @Test fun swappingTradesTheEndsAndKeepsOneAmount() {
        val s = form.swapTransfer(all)
        assertEquals(listOf("b", "a", "100"), listOf(s.accountId, s.toAccountId, s.amount))
    }

    @Test fun betweenCurrenciesTheAmountsTradeAndTheRateFollowsTheSource() {
        val s = form.copy(toAccountId = "usd", toAmount = "6.48").swapTransfer(all)
        assertEquals(listOf("usd", "a", "6.48", "100"), listOf(s.accountId, s.toAccountId, s.amount, s.toAmount))
        assertEquals("15.42", s.rate)
    }

    @Test fun aLoneAccountMovesToTheOtherSide() {
        val s = form.copy(toAccountId = null).swapTransfer(all)
        assertNull(s.accountId)
        assertEquals("a", s.toAccountId)
    }

    @Test fun pickingTheOtherSidesAccountSwapsInsteadOfDoubling() {
        val s = form.pickTransferEnd(b, source = true, all)
        assertEquals("b" to "a", s.accountId to s.toAccountId)
        val t = form.pickTransferEnd(a, source = false, all)
        assertEquals("b" to "a", t.accountId to t.toAccountId)
        assertEquals("usd", form.pickTransferEnd(usd, source = false, all).toAccountId)
    }
}
