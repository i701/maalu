package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TrashTemplateTest {
    @Test fun bulkMessagesSayWhatWasLeftAlone() {
        val done = { n: Int -> "Restored ${transactionCount(n)}" }
        assertEquals("Restored 3 transactions", bulkMessage(done, BulkResult(3)))
        assertEquals("Restored 1 transaction", bulkMessage(done, BulkResult(1)))
        assertEquals(
            "Restored 2 transactions. 3 skipped: Its purchase is not live; Not in the trash",
            bulkMessage(done, BulkResult(2, listOf(Skipped("a", "Its purchase is not live"), Skipped("b", "Not in the trash"), Skipped("c", "Not in the trash")))),
        )
        assertEquals("Restored 0 transactions. 1 skipped: x", bulkMessage(done, BulkResult(0, listOf(Skipped("a", "x")))))
    }

    @Test fun batchesAndMerging() {
        val ids = List(1203) { "id$it" }
        assertEquals(listOf(500, 500, 203), batches(ids).map { it.size })
        assertEquals(BulkResult(5, listOf(Skipped("a", "x"))), mergeBulk(listOf(BulkResult(2), BulkResult(3, listOf(Skipped("a", "x"))))))
        assertEquals("""{"ids":["a","b"]}""", idsJson(listOf("a", "b")).toString())
    }

    @Test fun selectionFollowsWhatIsOnScreen() {
        assertEquals(setOf("a"), toggled(emptySet(), "a"))
        assertEquals(emptySet<String>(), toggled(setOf("a"), "a"))
        assertEquals(setOf("b"), keepVisible(setOf("a", "b"), listOf("b", "c")))
    }

    private val bml = Account("a1", "BML Current", "accounts", "MVR", "100", "100", exchangeRate = "1")
    private val usd = Account("a2", "BML USD", "accounts", "USD", "100", "1500", exchangeRate = "15.4200")

    @Test fun aTemplateFillsTheFormItHasAnAccountFor() {
        val t = Template(
            id = "t", name = "Weekly shop", type = "expense", amount = "250.0000", currency = "USD", paymentMethod = "debit_card",
            category = "Groceries", vendor = "Super Mart", description = "weekly", account = TemplateAccount("a2", "BML USD", "USD"),
            tags = listOf(NameRef("food")),
        )
        val f = formFromTemplate(t, listOf(bml, usd))
        assertEquals("expense", f.type); assertEquals("250", f.amount); assertEquals("a2", f.accountId); assertEquals("15.42", f.rate)
        assertEquals("Groceries", f.category); assertEquals("Super Mart", f.vendor); assertEquals("debit_card", f.method)
        assertEquals(listOf("food"), f.tags); assertEquals("weekly", f.note)
        // an account that has since gone is left to the form's default
        assertNull(formFromTemplate(t, listOf(bml)).accountId)
    }

    @Test fun aTransferTemplateKeepsBothAccountsAndNoCategory() {
        val t = Template("t", "Top up", "transfer", amount = "500", paymentMethod = "other", category = "Stale", account = TemplateAccount("a1", "BML Current"), toAccount = TemplateAccount("a2", "BML USD"))
        val f = formFromTemplate(t, listOf(bml, usd))
        assertEquals("a1", f.accountId); assertEquals("a2", f.toAccountId); assertEquals("", f.category)
    }

    @Test fun savingTheFormAsATemplateLeavesOutWhatIsEmpty() {
        val f = AddForm(type = "expense", amount = "", accountId = "a1", category = "Groceries", vendor = " ", method = "cash", tags = listOf("food"), note = "")
        assertEquals(
            """{"name":"Shop","type":"expense","payment_method":"cash","account_id":"a1","category":"Groceries","tags":["food"]}""",
            f.toTemplateJson(" Shop ", listOf(bml, usd)).toString(),
        )
        val tr = AddForm(type = "transfer", amount = "500", accountId = "a1", toAccountId = "a2", category = "ignored")
        assertEquals(
            """{"name":"Top up","type":"transfer","amount":"500","payment_method":"other","account_id":"a1","to_account_id":"a2"}""",
            tr.toTemplateJson("Top up", listOf(bml, usd)).toString(),
        )
        assertEquals("""{"name":"New name"}""", renameJson(" New name ").toString())
    }

    @Test fun nameChecksAndSummaries() {
        assertNull(templateNameProblem("Shop"))
        assertEquals("Give it a name.", templateNameProblem("  "))
        assertEquals("A name can have 200 characters at most.", templateNameProblem("x".repeat(201)))
        assertEquals(
            "Expense · USD 250.00 · Groceries · Super Mart · BML USD",
            templateSummary(Template("t", "n", "expense", amount = "250", currency = "USD", category = "Groceries", vendor = "Super Mart", account = TemplateAccount("a2", "BML USD"))),
        )
        assertEquals("Income", templateSummary(Template("t", "n", "income")))
        assertEquals("Transfer · BML Current → BML USD", templateSummary(Template("t", "n", "transfer", account = TemplateAccount("a1", "BML Current"), toAccount = TemplateAccount("a2", "BML USD"))))
    }

    @Test fun bulkEditBodiesCarryOnlyWhatWasChosen() {
        assertEquals("""{"ids":["a","b"],"category":"Groceries"}""", bulkEditJson(listOf("a", "b"), BulkEdit(category = " Groceries ")).toString())
        assertEquals("""{"ids":["a"],"vendor_name":"Ensis","payment_method":"cash","add_tags":["trip"],"remove_tags":["tmp"]}""",
            bulkEditJson(listOf("a"), BulkEdit(vendor = "Ensis", method = "cash", addTags = listOf("trip"), removeTags = listOf("tmp"))).toString())
        assertEquals(true, BulkEdit().isEmpty); assertEquals(false, BulkEdit(method = "cash").isEmpty); assertEquals(true, BulkEdit(category = "  ").isEmpty)
    }

    @Test fun selectingEverythingThatMatches() {
        assertEquals(SelectAll.None, selectAllState(total = 300, loaded = 50, picked = 10, wide = false))      // not every loaded row ticked
        assertEquals(SelectAll.None, selectAllState(total = 50, loaded = 50, picked = 50, wide = false))       // everything is already loaded
        assertEquals(SelectAll.Offer(300), selectAllState(total = 300, loaded = 50, picked = 50, wide = false))
        assertEquals(SelectAll.TooMany(6000), selectAllState(total = 6000, loaded = 50, picked = 50, wide = false))
        assertEquals(SelectAll.Wide(300), selectAllState(total = 300, loaded = 50, picked = 300, wide = true))
    }
}
