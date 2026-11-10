package app.maalu.data

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SubscriptionLogicTest {
    private val mvr = Account("a1", "BML", "accounts", "MVR", "100", "100")
    private val usd = Account("a2", "USD", "accounts", "USD", "5", "77", exchangeRate = "15.42")
    private val accounts = listOf(mvr, usd)
    private val ok = SubscriptionForm(name = "Netflix", amount = "129", category = "Entertainment")

    @Test fun howOftenIsInWords() {
        assertEquals("every month", everyText("month", 1))
        assertEquals("every 3 months", everyText("month", 3))
        assertEquals("every week", everyText("week", 1))
        assertEquals("every 2 years", everyText("year", 2))
    }

    @Test fun aFixedPlanShowsHowManyArePaid() {
        assertEquals("3 of 12 paid", installmentsText(12, 3))
        assertEquals("12 of 12 paid", installmentsText(12, 14)) // never above the total
        assertNull(installmentsText(null, 5))
    }

    private fun sub(status: String = "active", overdue: Boolean = false, next: String? = "2026-11-28") = Subscription(
        "s", "Netflix", null, "129", "MVR", startDate = "2026-01-28", status = status, nextDueDate = next, isOverdue = overdue,
    )

    @Test fun theDueLineSaysWhenItIsNext() {
        assertEquals("every month · next 28 Nov", sub().dueText())
        assertEquals("every month · overdue since 28 Nov", sub(overdue = true).dueText())
        assertEquals("every month · paused", sub("paused").dueText())
        assertEquals("every month · all paid · 12 of 12 paid", sub("completed").copy(installmentsTotal = 12, paymentsMade = 12).dueText())
    }

    @Test fun aSubscriptionNeedsItsBasics() {
        assertEquals(SubField.Name, SubscriptionForm().problem(accounts, "MVR")?.field)
        assertEquals(SubField.Amount, SubscriptionForm(name = "N").problem(accounts, "MVR")?.field)
        assertEquals(SubField.Category, SubscriptionForm(name = "N", amount = "5").problem(accounts, "MVR")?.field)
        assertEquals(SubField.Count, ok.copy(count = "0").problem(accounts, "MVR")?.field)
        assertEquals(SubField.Installments, ok.copy(installments = "0").problem(accounts, "MVR")?.field)
        assertNull(ok.problem(accounts, "MVR"))
    }

    @Test fun aForeignAccountNeedsARate() {
        assertEquals(SubField.Rate, ok.copy(accountId = "a2", rate = "").problem(accounts, "MVR")?.field)
        assertNull(ok.copy(accountId = "a2", rate = "15.42").problem(accounts, "MVR"))
    }

    @Test fun theCreateBodyCarriesTheScheduleAndTheReminder() {
        val j = ok.copy(installments = "12", remind = 7, varies = true, vendor = " Netflix ").toJson(accounts, "MVR")
        assertEquals("month", j["interval_unit"]!!.jsonPrimitive.content)
        assertEquals("12", j["installments_total"]!!.jsonPrimitive.content)
        assertEquals("7", j["remind_days_before"]!!.jsonPrimitive.content)
        assertEquals("Netflix", j["vendor_name"]!!.jsonPrimitive.content)
        assertFalse(j.containsKey("currency"))
        assertTrue(ok.copy(remind = null).toJson(accounts, "MVR")["remind_days_before"] is JsonNull)
    }

    @Test fun aForeignAccountBringsItsCurrencyAndRate() {
        val j = ok.copy(accountId = "a2", rate = "15.42").toJson(accounts, "MVR")
        assertEquals("USD", j["currency"]!!.jsonPrimitive.content)
        assertEquals("15.42", j["exchange_rate"]!!.jsonPrimitive.content)
    }

    @Test fun anEditSendsOnlyWhatChanged() {
        val before = ok.copy(vendor = "Netflix", installments = "12")
        assertTrue(before.patchJson(before, accounts, "MVR").isEmpty())
        assertTrue(before.copy(amount = "129.00").patchJson(before, accounts, "MVR").isEmpty())
        val j = before.copy(amount = "149", status = "paused").patchJson(before, accounts, "MVR")
        assertEquals(setOf("amount", "status"), j.keys)
    }

    @Test fun endingAPlanOrClearingTheVendorIsAnExplicitNull() {
        val before = ok.copy(vendor = "Netflix", installments = "12", remind = 3)
        val j = before.copy(vendor = "", installments = "", remind = null).patchJson(before, accounts, "MVR")
        assertEquals(setOf("vendor_name", "installments_total", "remind_days_before"), j.keys)
        assertTrue(j.values.all { it is JsonNull })
    }

    private val cand = SubscriptionCandidate("v1", "Netflix", "MVR", "129", false, "month", 1, 5, "2026-11-28", "high", "Entertainment")

    @Test fun acceptingSendsOnlyTheChanges() {
        val untouched = acceptJson(cand, "Netflix", "129", "1", "month")
        assertEquals(setOf("vendor_id", "currency"), untouched.keys)
        val changed = acceptJson(cand, "Netflix Premium", "149", "3", "week")
        assertEquals(setOf("vendor_id", "currency", "name", "amount", "interval_count", "interval_unit"), changed.keys)
    }

    @Test fun aSuggestionIsDismissedByVendorAndCurrency() {
        assertEquals(setOf("vendor_id", "currency"), dismissJson(cand).keys)
        assertEquals("Looks regular", confidenceText(cand)); assertEquals("Looser fit", confidenceText(cand.copy(confidence = "medium")))
    }

    @Test fun onlyTheRightOnesCanBePausedOrResumed() {
        assertTrue(sub().canPause()); assertFalse(sub("paused").canPause()); assertFalse(sub("completed").canPause())
        assertTrue(sub("paused").canResume()); assertTrue(sub("cancelled").canResume()); assertFalse(sub().canResume())
    }
}
