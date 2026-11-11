package app.maalu.data

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.math.BigDecimal

class PlanLogicTest {
    private fun bill(id: String, title: String, amount: String, date: String, overdue: Boolean = false, estimate: Boolean = false) =
        AvailableBill(id, title, amount, date, overdue, estimate)

    private fun data(
        balance: String = "1000", reserved: String = "0", bills: List<AvailableBill> = emptyList(),
        cards: List<AvailableCardPayment> = emptyList(), expected: List<AvailableBill> = emptyList(), available: String = "0",
    ) = AvailableToSpend(
        available = available, balance = balance, currency = "MVR", today = "2026-11-10", accounts = emptyList(), bills = bills,
        billsTotal = "0", cardPayments = cards, cardPaymentsTotal = "0", reserved = emptyList(), reservedTotal = reserved,
        expected = expected, periodEnd = "2026-11-30",
    )

    @Test fun theStartingPointIsWhatYouHoldLessWhatIsSetAside() {
        assertEquals(0, BigDecimal("700").compareTo(startingPoint("1000", "300")))
    }

    @Test fun eachBillTakesItsAmountOffTheRunningFigure() {
        val days = planDays(data(bills = listOf(bill("a", "Rent", "400", "2026-11-12"), bill("b", "Wifi", "100", "2026-11-15"))))
        val rows = days.flatMap { it.rows }
        assertEquals(listOf("Rent", "Wifi"), rows.map { it.title })
        assertEquals(0, BigDecimal("600").compareTo(rows[0].left)); assertEquals(0, BigDecimal("500").compareTo(rows[1].left))
        assertTrue(rows.none { it.short })
    }

    @Test fun overdueComesFirstAndGroupsTogether() {
        val days = planDays(data(bills = listOf(
            bill("a", "Later", "10", "2026-11-20"), bill("b", "Late one", "10", "2026-11-01", overdue = true), bill("c", "Late two", "10", "2026-11-05", overdue = true),
        )))
        assertEquals("overdue", days.first().key); assertEquals(2, days.first().rows.size); assertNull(days.first().date)
        assertEquals("2026-11-20", days.last().date)
    }

    @Test fun incomeIsListedButNeverCounted() {
        val days = planDays(data(bills = listOf(bill("a", "Rent", "400", "2026-11-12")), expected = listOf(bill("s", "Salary", "10000", "2026-11-12"))))
        val rows = days.single().rows
        assertEquals(listOf("Rent", "Salary"), rows.map { it.title }) // income after what is paid that day
        assertNull(rows[1].left)
        assertEquals(0, BigDecimal("600").compareTo(rows[0].left))
    }

    @Test fun theFirstBillThatGoesBelowZeroIsMarked() {
        val days = planDays(data(balance = "300", bills = listOf(bill("a", "Rent", "200", "2026-11-12"), bill("b", "Insurance", "200", "2026-11-14"), bill("c", "Wifi", "50", "2026-11-16"))))
        val rows = days.flatMap { it.rows }
        assertFalse(rows[0].short); assertTrue(rows[1].short); assertTrue(rows[1].firstShort)
        assertTrue(rows[2].short); assertFalse(rows[2].firstShort)
        assertEquals("Insurance", firstShortRow(days)?.title)
    }

    @Test fun aCardStatementIsABillThatOpensTheCard() {
        val days = planDays(data(cards = listOf(AvailableCardPayment("card1", "Visa", "250", "2026-11-14"))))
        val row = days.single().rows.single()
        assertEquals(PlanKind.Card, row.kind); assertEquals("Visa card payment", row.title); assertEquals("card1", row.cardId)
    }

    @Test fun theDayLabelsAreFriendly() {
        val d = { date: String? -> PlanDay(date ?: "overdue", date == null, date, emptyList()) }
        assertEquals("Overdue", planDayLabel(d(null), "2026-11-10"))
        assertEquals("Today", planDayLabel(d("2026-11-10"), "2026-11-10"))
        assertEquals("Tomorrow", planDayLabel(d("2026-11-11"), "2026-11-10"))
        assertEquals("Thu 12 Nov", planDayLabel(d("2026-11-12"), "2026-11-10"))
    }

    @Test fun shortMeansAvailableBelowZero() {
        assertTrue(data(available = "-1").isShort()); assertFalse(data(available = "0").isShort()); assertFalse(data(available = "5").isShort())
    }

    @Test fun aBillInAnotherCurrencyIsWorkedOutInTheBase() {
        assertEquals("154.2000", baseOf("10", "15.42"))
        assertEquals("0.0002", baseOf("0.00005", "4")) // half to even: 0.0002
        assertNull(baseOf("abc", "15.42")); assertNull(baseOf("10", ""))
        assertTrue(sameRate("15.4", "15.40000000")); assertFalse(sameRate("15.4", "15.41"))
    }

    @Test fun whatIsSentDependsOnWhatChanged() {
        assertEquals(PayAmounts("50"), payBody("50", foreign = false, rate = "15", plannedRate = "15", charged = "99"))
        assertEquals(PayAmounts("10", baseAmount = "160"), payBody("10", true, "15.5", "15.42", charged = " 160 ")) // what it cost wins
        assertEquals(PayAmounts("10", exchangeRate = "15.5"), payBody("10", true, "15.5", "15.42", ""))
        assertEquals(PayAmounts("10"), payBody("10", true, "15.42000000", "15.42", "")) // an unchanged rate is left out
    }

    @Test fun theRequestCarriesTheDayAndAnExplicitNullTime() {
        val j = markPaidJson("2026-11-10", null, PayAmounts("45", exchangeRate = "15.5"))
        assertEquals("2026-11-10", j["transaction_date"]!!.jsonPrimitive.content)
        assertTrue(j["transaction_time"] is JsonNull)
        assertEquals("45", j["amount"]!!.jsonPrimitive.content); assertEquals("15.5", j["exchange_rate"]!!.jsonPrimitive.content)
        assertEquals("14:30:00", markPaidJson("2026-11-10", "14:30", null)["transaction_time"]!!.jsonPrimitive.content)
        assertFalse(markPaidJson("2026-11-10", null, null).containsKey("amount")) // a transfer moves what was planned
    }

    @Test fun theActionNamesFollowTheType() {
        assertEquals("Mark as paid", payTitle("expense")); assertEquals("Mark as received", payTitle("income")); assertEquals("Mark as done", payTitle("transfer"))
    }

    @Test fun dueLabelsCountDays() {
        assertEquals("Due today", dueLabel("2026-11-10", "2026-11-10")); assertEquals("Due tomorrow", dueLabel("2026-11-11", "2026-11-10"))
        assertEquals("Due in 5 days", dueLabel("2026-11-15", "2026-11-10")); assertEquals("1 day overdue", dueLabel("2026-11-09", "2026-11-10"))
        assertEquals("3 days overdue", dueLabel("2026-11-07", "2026-11-10"))
    }
}
