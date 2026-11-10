package app.maalu.data

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AccountLogicTest {
    @Test fun aNameIsRequired() {
        assertEquals(AccountField.Name, AccountForm(currency = "MVR").problem("MVR")?.field)
        assertNull(AccountForm(name = "Cash", currency = "MVR").problem("MVR"))
    }

    @Test fun aForeignCurrencyNeedsARate() {
        assertEquals(AccountField.Rate, AccountForm(name = "USD", currency = "USD", rate = "").problem("MVR")?.field)
        assertNull(AccountForm(name = "USD", currency = "USD", rate = "15.42").problem("MVR"))
    }

    @Test fun statementDaysComeInPairsFromOneToThirtyOne() {
        assertNull(statementDaysProblem("", ""))
        assertEquals("Give both the day the statement closes and the day it is due.", statementDaysProblem("12", ""))
        assertEquals("Days are whole numbers from 1 to 31.", statementDaysProblem("0", "5"))
        assertEquals("Days are whole numbers from 1 to 31.", statementDaysProblem("12", "40"))
        assertNull(statementDaysProblem("12", "28"))
    }

    @Test fun creditUsageCountsOnlyWhatIsOwed() {
        val u = creditUsage("-250", "1000")!!
        assertEquals(25, u.percent)
        assertEquals(0, creditUsage("50", "1000")!!.percent)
        assertNull(creditUsage("-5", null))
        assertNull(creditUsage("-5", "0"))
    }

    @Test fun signedAmountsKeepTheirMinus() {
        assertEquals("-12.5", cleanSigned("-12.5"))
        assertEquals("12.5", cleanSigned("1a2.5"))
        assertEquals("-", cleanSigned("-"))
    }

    @Test fun theCreateBodyLeavesOutWhatIsBlankAndOnlyForTheRightGroups() {
        val j = AccountForm(group = "cash", name = " Wallet ", currency = "MVR", creditLimit = "500", statementDay = "1", dueDay = "2").toJson("MVR")
        assertEquals("Wallet", j["name"]!!.jsonPrimitive.content)
        assertFalse(j.containsKey("credit_limit")) // only cards and overdrafts
        assertFalse(j.containsKey("statement_day")) // only cards
        assertFalse(j.containsKey("exchange_rate"))
        val card = AccountForm(group = "card", name = "Visa", currency = "MVR", creditLimit = "5000", statementDay = "12", dueDay = "28").toJson("MVR")
        assertEquals("5000", card["credit_limit"]!!.jsonPrimitive.content)
        assertEquals("12", card["statement_day"]!!.jsonPrimitive.content)
    }

    @Test fun aForeignAccountSendsItsRateAndTheMarketSwitch() {
        val j = AccountForm(name = "USD", currency = "USD", rate = "15.42", autoRate = true).toJson("MVR")
        assertEquals("15.42", j["exchange_rate"]!!.jsonPrimitive.content)
        assertTrue(j["auto_rate"]!!.jsonPrimitive.content.toBoolean())
    }

    @Test fun spendableIsSentOnlyWhenItDiffersFromTheGroup() {
        assertFalse(AccountForm(name = "A", currency = "MVR", spendable = true).toJson("MVR").containsKey("spendable")) // accounts are everyday money already
        assertEquals("false", AccountForm(name = "A", currency = "MVR", spendable = false).toJson("MVR")["spendable"]!!.jsonPrimitive.content)
        assertFalse(AccountForm(group = "loan", name = "L", currency = "MVR", spendable = true).toJson("MVR").containsKey("spendable")) // what is owed never counts
    }

    @Test fun anEditSendsOnlyTheChanges() {
        val saved = Account("1", "BML", "accounts", "MVR", "100", "100", bank = "BML", accountNumber = "123", openingAmount = "100.0000")
        val before = formFrom(saved)
        assertTrue(before.patchJson(before, "MVR").isEmpty())
        assertTrue(before.copy(opening = "100").patchJson(before, "MVR").isEmpty())
        val j = before.copy(name = "BML Current", bank = "", opening = "250").patchJson(before, "MVR")
        assertEquals(setOf("name", "bank", "opening_amount"), j.keys)
        assertTrue(j["bank"] is JsonNull)
    }

    @Test fun banksAlreadyUsedComeFirst() {
        val a = Account("1", "A", "accounts", "MVR", "0", "0", bank = "MIB")
        assertEquals("MIB", bankChoices(listOf(a)).first())
        assertEquals(1, bankChoices(listOf(a)).count { it == "MIB" })
        assertTrue("BML" in bankChoices(listOf(a)))
    }
}
