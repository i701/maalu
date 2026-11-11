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

    @Test fun aVendorFillsOnlyWhatIsEmpty() {
        val v = VendorItem("v1", "Ensis Mart", defaultCategory = "Groceries", defaultTags = listOf(NameRef("weekly")))
        val filled = AddForm().withVendor(v)
        assertEquals("Ensis Mart", filled.vendor)
        assertEquals("Groceries", filled.category)
        assertEquals(listOf("weekly"), filled.tags)
        // what was already chosen stays
        val kept = AddForm(category = "Dining", tags = listOf("trip")).withVendor(v)
        assertEquals("Dining", kept.category)
        assertEquals(listOf("trip"), kept.tags)
    }

    @Test fun aVendorWithNoDefaultsChangesOnlyTheName() {
        val form = AddForm(category = "Food").withVendor(VendorItem("v2", "Cafe"))
        assertEquals("Cafe", form.vendor)
        assertEquals("Food", form.category)
        assertTrue(form.tags.isEmpty())
    }

    private val saved = Transaction(
        id = "t1", type = "expense", amount = "45.0000", currency = "MVR", category = "Food", date = "2026-11-10", time = "14:30:00",
        description = "Lunch", paymentMethod = "cash", exchangeRate = "1.00000000",
        account = NameRef("BML", id = "a1"), vendor = NameRef("Cafe", id = "v1"), tags = listOf(NameRef("weekly")),
    )

    @Test fun aSavedTransactionFillsTheForm() {
        val f = formFrom(saved)
        assertEquals("45", f.amount)
        assertEquals("a1", f.accountId)
        assertEquals("14:30", f.time)
        assertEquals("Cafe", f.vendor)
        assertEquals("cash", f.method)
        assertEquals(listOf("weekly"), f.tags)
        assertEquals("1", f.rate)
    }

    @Test fun nothingChangedSendsNothing() {
        val f = formFrom(saved)
        assertTrue(f.patchJson(f, accounts, "MVR").isEmpty())
        // 45 and 45.00 are the same amount
        assertTrue(f.copy(amount = "45.00").patchJson(f, accounts, "MVR").isEmpty())
    }

    @Test fun onlyWhatChangedIsSent() {
        val before = formFrom(saved)
        val j = before.copy(amount = "50", category = "Dining").patchJson(before, accounts, "MVR")
        assertEquals(setOf("amount", "category"), j.keys)
        assertEquals("50", j["amount"]!!.jsonPrimitive.content)
    }

    @Test fun clearingAFieldSendsAnExplicitNull() {
        val before = formFrom(saved)
        val j = before.copy(vendor = "", note = "", time = null).patchJson(before, accounts, "MVR")
        assertEquals(setOf("vendor_name", "description", "transaction_time"), j.keys)
        assertTrue(j["vendor_name"] is kotlinx.serialization.json.JsonNull)
        assertTrue(j["description"] is kotlinx.serialization.json.JsonNull)
        assertTrue(j["transaction_time"] is kotlinx.serialization.json.JsonNull)
    }

    @Test fun clearingTagsSendsAnEmptyList() {
        val before = formFrom(saved)
        val j = before.copy(tags = emptyList()).patchJson(before, accounts, "MVR")
        assertEquals(0, j["tags"]!!.jsonArray.size)
    }

    @Test fun movingToAForeignAccountCarriesItsCurrencyAndRate() {
        val before = formFrom(saved.copy(account = NameRef("BML", id = "a1")))
        val j = before.copy(accountId = "a2", rate = "15.42").patchJson(before, accounts, "MVR")
        assertEquals("a2", j["account_id"]!!.jsonPrimitive.content)
        assertEquals("USD", j["currency"]!!.jsonPrimitive.content)
        assertEquals("15.42", j["exchange_rate"]!!.jsonPrimitive.content)
    }

    @Test fun refundsAndAdjustmentsAreNotEditedHere() {
        assertTrue(saved.canEdit())
        assertFalse(saved.copy(adjustment = true).canEdit())
        assertFalse(saved.copy(refundOf = AppJson.parseToJsonElement("""{"id":"x"}""")).canEdit())
    }

    @Test fun choosingTheAccountKeepsEverythingElseOnTheForm() {
        // a transfer in progress: the type, the amount, the other account and the note must survive picking a source account
        val form = AddForm(type = "transfer", amount = "250", accountId = "a1", toAccountId = "a2", toAmount = "16", note = "rent share", methodTouched = true, method = "cash")
        val next = form.withAccount(usd)
        assertEquals("transfer", next.type)
        assertEquals("250", next.amount); assertEquals("a2", next.toAccountId); assertEquals("16", next.toAmount); assertEquals("rent share", next.note)
        assertEquals("a2", next.accountId) // the account it was given (usd is a2 in this fixture)
        assertEquals("15.42", next.rate)
        assertEquals("cash", next.method) // a method the person chose is not replaced
    }

    @Test fun anUntouchedMethodFollowsTheNewAccount() {
        assertEquals("bank_transfer", AddForm(type = "income", method = "other").withAccount(mvr).method)
        assertEquals("credit_card", AddForm(method = "other").withAccount(Account("c", "Visa", "card", "MVR", "0", "0")).method)
    }

    @Test fun addAnotherKeepsWhereItWentAndClearsWhatWasSpecific() {
        val saved = AddForm(
            type = "expense", amount = "45", accountId = "a1", category = "Groceries", vendor = "Ensis Mart", method = "debit_card", methodTouched = true,
            tags = listOf("weekly"), note = "milk", time = "16:41", date = "2026-10-01", latitude = "4.17", longitude = "73.51", place = "Shop", planned = true, plannedTouched = true,
        )
        val next = seedAfterSave(saved, LocalDate.of(2026, 11, 11))
        assertEquals("", next.amount); assertEquals("", next.note); assertNull(next.time)
        assertEquals("", next.latitude); assertEquals("", next.place)
        assertEquals("2026-11-11", next.date); assertFalse(next.planned); assertFalse(next.plannedTouched)
        assertEquals("a1", next.accountId); assertEquals("Groceries", next.category); assertEquals("Ensis Mart", next.vendor)
        assertEquals("debit_card", next.method); assertEquals(listOf("weekly"), next.tags)
    }

    @Test fun aDuplicateIsTheSameEntryForToday() {
        val t = Transaction(id = "t", type = "expense", amount = "45.0000", currency = "MVR", category = "Groceries", date = "2026-10-01", time = "16:41:00", planned = true, description = "milk")
        val f = duplicateForm(t, LocalDate.of(2026, 11, 11))
        assertEquals("45", f.amount); assertEquals("Groceries", f.category); assertEquals("milk", f.note)
        assertEquals("2026-11-11", f.date); assertNull(f.time); assertFalse(f.planned)
        assertTrue(t.canDuplicate())
        assertFalse(t.copy(adjustment = true).canDuplicate())
    }

    @Test fun pickingAVendorMarksItsUsualPlaceOnlyWhenNoneIsMarked() {
        val shop = VendorItem("v", "Ensis", latitude = "4.1755", longitude = "73.5094", place = "Ensis Mart")
        val f = AddForm().withVendor(shop)
        assertEquals("4.1755", f.latitude); assertEquals("Ensis Mart", f.place); assertEquals("Ensis", f.vendor)
        val kept = AddForm(latitude = "1.0", longitude = "2.0", place = "Mine").withVendor(shop)
        assertEquals("1.0", kept.latitude); assertEquals("Mine", kept.place)
        assertEquals("", AddForm().withVendor(VendorItem("w", "No place")).latitude)
    }
}
