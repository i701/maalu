package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CardLogicTest {
    private fun acc(id: String, group: String, rate: String = "1") = Account(id, id.uppercase(), group, "MVR", "0", "0", exchangeRate = rate)
    private fun card(id: String, kind: String, account: String, repay: String? = null) =
        Card(id, "Card $id", "1234", kind, NameRef(account, id = account), repay?.let { NameRef(it, id = it) })

    @Test fun textAndMethod() {
        assertEquals("MIB Visa ••2815", cardText("MIB Visa", "2815")); assertEquals("MIB Visa", cardText("MIB Visa", null)); assertEquals("MIB Visa", cardText("MIB Visa", ""))
        assertEquals("credit_card", cardMethod("credit")); assertEquals("debit_card", cardMethod("debit"))
    }

    @Test fun whoCanHaveCardsAndBeRepaidFrom() {
        assertTrue(canHaveCards("accounts")); assertTrue(canHaveCards("card")); assertFalse(canHaveCards("loan")); assertFalse(canHaveCards("overdrafts"))
        val list = listOf(acc("bank", "accounts"), acc("save", "savings"), acc("visa", "card"), acc("loan", "loan"), acc("od", "overdrafts"))
        assertEquals(listOf("bank", "save"), repayChoices(list, "visa").map { it.id })
        assertEquals(listOf("save"), repayChoices(list, "bank").map { it.id })
    }

    @Test fun cardsOnAnAccountsPage() {
        val d = card("d", "debit", "bank"); val c = card("c", "credit", "visa", repay = "bank")
        assertEquals(listOf(d), cardsOf(listOf(d, c), "bank").own); assertEquals(listOf(c), cardsOf(listOf(d, c), "bank").repaid)
        assertEquals(listOf(c), cardsOf(listOf(d, c), "visa").own)
    }

    @Test fun formRules() {
        assertNotNull(cardNameProblem(" ")); assertNull(cardNameProblem("MIB Visa")); assertNotNull(cardNameProblem("x".repeat(101)))
        assertNull(cardDigitsProblem("")); assertNull(cardDigitsProblem("2815")); assertNotNull(cardDigitsProblem("281")); assertNotNull(cardDigitsProblem("28a5"))
    }

    @Test fun bodies() {
        assertEquals("""{"name":"MIB Visa","kind":"debit","last_digits":"2815","account_id":"bank"}""", cardCreateJson(acc("bank", "accounts"), " MIB Visa ", "2815", "ignored").toString())
        assertEquals("""{"name":"Visa","kind":"credit","account_id":"visa","repay_account_id":"bank"}""", cardCreateJson(acc("visa", "card"), "Visa", "", "bank").toString())
        assertEquals("""{"name":"Visa","last_digits":null,"repay_account_id":null}""", cardUpdateJson(true, "Visa", "", null).toString())
        assertEquals("""{"name":"Debit","last_digits":"1111"}""", cardUpdateJson(false, "Debit", "1111", "bank").toString())
    }

    @Test fun theFormOffersTheChosenAccountsCardsAndPickingOneSetsTheAccountAndMethod() {
        val d = card("d", "debit", "bank"); val c = card("c", "credit", "visa")
        assertEquals(listOf(d, c), cardsForForm(listOf(d, c), null)); assertEquals(listOf(d), cardsForForm(listOf(d, c), "bank"))
        val accounts = listOf(acc("bank", "accounts", "1"), acc("visa", "card", "15.4"))
        val f = AddForm(accountId = "bank", method = "cash", methodTouched = false).withCard(c, accounts)
        assertEquals("c", f.cardId); assertEquals("visa", f.accountId); assertEquals("credit_card", f.method); assertEquals("15.4", f.rate); assertTrue(f.methodTouched)
        // choosing another account drops a card that was on the old one; the same account keeps it
        assertNull(f.withAccount(accounts[0]).cardId); assertEquals("c", f.withAccount(accounts[1]).cardId)
    }

    @Test fun aCardGoesToTheServerOnAnExpenseOnly() {
        val accounts = listOf(acc("bank", "accounts"))
        val f = AddForm(type = "expense", amount = "5", accountId = "bank", category = "Food", cardId = "d")
        assertEquals("d", f.toJson(accounts, "MVR")["card_id"]!!.toString().trim('"'))
        assertFalse(f.copy(type = "income").toJson(accounts, "MVR").containsKey("card_id"))
        // editing: a changed or cleared card is sent, an unchanged one is not
        assertTrue(f.patchJson(f.copy(cardId = null), accounts, "MVR").containsKey("card_id"))
        assertEquals("""{"card_id":null}""", f.copy(cardId = null).patchJson(f, accounts, "MVR").toString())
        assertFalse(f.patchJson(f, accounts, "MVR").containsKey("card_id"))
    }

    @Test fun repayingACreditCard() {
        val c = card("c", "credit", "visa", repay = "bank")
        val f = repaymentForm(c, "250.0000")!!
        assertEquals("transfer", f.type); assertEquals("250", f.amount); assertEquals("bank", f.accountId); assertEquals("visa", f.toAccountId); assertEquals("Card c repayment", f.note)
        assertNull(repaymentForm(card("c", "credit", "visa"))); assertNull(repaymentForm(card("d", "debit", "bank", repay = "x")))
    }
}
