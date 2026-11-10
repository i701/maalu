package app.maalu.data

import java.time.LocalDate
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AddTransactionTest {
    private val mvr = Account("a1", "BML", "accounts", "MVR", "100", "100")
    private val usd = Account("a2", "USD", "accounts", "USD", "5", "77", exchangeRate = "15.42")
    private val accounts = listOf(mvr, usd)

    @Test fun amountsAreCleanedAsTyped() {
        assertEquals("12.5", cleanAmount("12.5"))
        assertEquals("12.50", cleanAmount("1a2.5.0"))
        assertEquals("1.2345", cleanAmount("1.23456"))
        assertEquals("", cleanAmount("abc"))
    }

    @Test fun anAmountMustBeAboveZero() {
        assertEquals("Enter an amount above zero.", AddForm(amount = "").problem(accounts, "MVR")?.message)
        assertEquals(FormField.Amount, AddForm(amount = "0").problem(accounts, "MVR")?.field)
        assertNull(AddForm(amount = "5", accountId = "a1", category = "Food").problem(accounts, "MVR"))
    }

    @Test fun incomeAndExpenseNeedACategory() {
        val p = AddForm(amount = "5", accountId = "a1").problem(accounts, "MVR")
        assertEquals(FormField.Category, p?.field)
        assertNull(AddForm(type = "income", amount = "5", accountId = "a1", category = "Salary").problem(accounts, "MVR"))
    }

    @Test fun aForeignAccountNeedsARate() {
        assertEquals("Enter the exchange rate.", AddForm(amount = "5", accountId = "a2", rate = "", category = "Food").problem(accounts, "MVR")?.message)
        assertNull(AddForm(amount = "5", accountId = "a2", rate = "15.42", category = "Food").problem(accounts, "MVR"))
    }

    @Test fun aTransferNeedsTwoDifferentAccounts() {
        val t = AddForm(type = "transfer", amount = "5", accountId = "a1")
        assertEquals(FormField.ToAccount, t.problem(accounts, "MVR")?.field)
        assertEquals("A transfer needs two different accounts.", t.copy(toAccountId = "a1").problem(accounts, "MVR")?.message)
        assertEquals("Enter how much arrives in USD.", t.copy(toAccountId = "a2").problem(accounts, "MVR")?.message)
        assertNull(t.copy(toAccountId = "a2", toAmount = "0.3").problem(accounts, "MVR"))
    }

    @Test fun theRequestLeavesOutWhatIsBlank() {
        val j = AddForm(amount = " 45.00 ", accountId = "a1", category = "Food", date = "2026-11-10", method = "cash").toJson(accounts, "MVR")
        assertEquals("expense", j["type"]!!.jsonPrimitive.content)
        assertEquals("45.00", j["amount"]!!.jsonPrimitive.content)
        assertEquals("Food", j["category"]!!.jsonPrimitive.content)
        assertEquals("cash", j["payment_method"]!!.jsonPrimitive.content)
        assertFalse(j.containsKey("vendor_name"))
        assertFalse(j.containsKey("currency")) // the base currency is the default
        assertFalse(j.containsKey("planned"))
    }

    @Test fun aForeignExpenseCarriesItsCurrencyAndRate() {
        val j = AddForm(amount = "5", accountId = "a2", rate = "15.42", tags = listOf("trip"), time = "14:30").toJson(accounts, "MVR")
        assertEquals("USD", j["currency"]!!.jsonPrimitive.content)
        assertEquals("15.42", j["exchange_rate"]!!.jsonPrimitive.content)
        assertEquals("trip", j["tags"]!!.jsonArray.first().jsonPrimitive.content)
        assertEquals("14:30:00", j["transaction_time"]!!.jsonPrimitive.content)
    }

    @Test fun aTransferSendsBothAccountsAndNoCategory() {
        val j = AddForm(type = "transfer", amount = "154.2", accountId = "a1", toAccountId = "a2", toAmount = "10", category = "x").toJson(accounts, "MVR")
        assertEquals("a2", j["to_account_id"]!!.jsonPrimitive.content)
        assertEquals("10", j["to_amount"]!!.jsonPrimitive.content)
        assertFalse(j.containsKey("category"))
        assertFalse(j.containsKey("payment_method"))
    }

    @Test fun aFutureDateTurnsPlannedOnUntilChosen() {
        val today = LocalDate.of(2026, 11, 10)
        assertTrue(AddForm().withDate("2026-11-20", today).planned)
        assertFalse(AddForm().withDate("2026-11-09", today).planned)
        assertFalse(AddForm(plannedTouched = true, planned = false).withDate("2026-11-20", today).planned)
    }

    @Test fun methodsFollowTheAccountGroup() {
        assertEquals("cash", suggestedMethod("cash"))
        assertEquals("credit_card", suggestedMethod("card"))
        assertEquals("bank_transfer", suggestedMethod("accounts"))
        assertEquals("other", suggestedMethod("loan"))
    }

    @Test fun ratesAreTidied() {
        assertEquals("15.42", tidyRate("15.42000000"))
        assertEquals("1", tidyRate("1.00000000"))
    }
}
