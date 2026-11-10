package app.maalu.data

import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.math.BigDecimal

class AccountDetailLogicTest {
    private fun tx(type: String, from: String? = "a1", to: String? = null, toAmount: String? = null) = Transaction(
        "t", type, "100", "MVR", "X", date = "2026-11-10",
        account = from?.let { NameRef("BML", id = it) }, toAccount = to?.let { NameRef("USD acc", currency = "USD", id = it) }, toAmount = toAmount,
    )

    @Test fun anExpenseTakesAwayAndIncomeAdds() {
        assertFalse(accountEffect(tx("expense"), "a1").positive)
        assertTrue(accountEffect(tx("income"), "a1").positive)
    }

    @Test fun aTransferReadsFromEachSide() {
        val t = tx("transfer", from = "a1", to = "a2", toAmount = "6.5")
        val out = accountEffect(t, "a1")
        assertFalse(out.positive); assertEquals("100", out.amount); assertEquals("To USD acc", out.counterpart)
        val inn = accountEffect(t, "a2")
        assertTrue(inn.positive); assertEquals("6.5", inn.amount); assertEquals("USD", inn.currency); assertEquals("From BML", inn.counterpart)
    }

    @Test fun theChartSummaryFindsTheEndsAndExtremes() {
        val pts = listOf("100", "250", "80", "120").mapIndexed { i, b -> AccountBalancePoint("2026-11-0${i + 1}", b) }
        val s = historySummary(pts)!!
        assertEquals(0, BigDecimal("100").compareTo(s.start)); assertEquals(0, BigDecimal("120").compareTo(s.end))
        assertEquals(0, BigDecimal("80").compareTo(s.low)); assertEquals(0, BigDecimal("250").compareTo(s.high))
        assertNull(historySummary(emptyList()))
    }

    @Test fun settingTheBalanceWorksOutTheDifference() {
        val up = adjustmentPreview("1000", AdjustMode.Balance, "1250.5")!!
        assertEquals("income", up.kind); assertEquals(0, BigDecimal("250.5").compareTo(up.amount)); assertEquals(0, BigDecimal("1250.5").compareTo(up.after))
        val down = adjustmentPreview("1000", AdjustMode.Balance, "900")!!
        assertEquals("expense", down.kind); assertEquals(0, BigDecimal("100").compareTo(down.amount))
        assertNull(adjustmentPreview("1000", AdjustMode.Balance, "1000")!!.kind)
    }

    @Test fun addingOrTakingAwayAnAmountMovesTheBalance() {
        val p = adjustmentPreview("1000", AdjustMode.Amount, "-75")!!
        assertEquals("expense", p.kind); assertEquals(0, BigDecimal("925").compareTo(p.after))
        assertEquals("income", adjustmentPreview("-200", AdjustMode.Amount, "50")!!.kind)
    }

    @Test fun anAdjustmentNeedsANumber() {
        assertNull(adjustmentPreview("1000", AdjustMode.Balance, ""))
        assertNull(adjustmentPreview("1000", AdjustMode.Balance, "12a"))
        assertNull(adjustmentPreview("1000", AdjustMode.Balance, "1.23456"))
    }

    @Test fun theAdjustBodyHasExactlyOneOfTheTwoFields() {
        val a = adjustJson(AdjustMode.Balance, " 500 ", " matched the bank ")
        assertEquals("500", a["new_balance"]!!.jsonPrimitive.content); assertFalse(a.containsKey("amount"))
        assertEquals("matched the bank", a["note"]!!.jsonPrimitive.content)
        val b = adjustJson(AdjustMode.Amount, "-20", "")
        assertEquals("-20", b["amount"]!!.jsonPrimitive.content); assertFalse(b.containsKey("note"))
    }

    @Test fun repayingACardIsATransferIntoIt() {
        val card = Account("c1", "Visa", "card", "MVR", "-500", "-500")
        val f = repayForm(card, "500.0000", "a1")
        assertEquals("transfer", f.type); assertEquals("c1", f.toAccountId); assertEquals("a1", f.accountId); assertEquals("500", f.amount)
    }

    private fun statement(state: String, days: Int) = CardStatement("c1", "MVR", 12, 28, "2026-11-12", "2026-11-28", "500", "0", "500", "20", "520", "5000", state, days)

    @Test fun theStatementLineSaysWhatToDo() {
        assertEquals("Pay MVR 500.00 by 28 Nov (in 4 days)", statementLine(statement("due", 4)))
        assertEquals("Pay MVR 500.00 by 28 Nov (tomorrow)", statementLine(statement("due", 1)))
        assertEquals("Pay MVR 500.00: overdue by 3 days", statementLine(statement("overdue", -3)))
        assertEquals("Statement paid", statementLine(statement("paid", 4)))
    }
}
