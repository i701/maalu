package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class DocsLogicTest {
    private fun doc(slug: String, title: String, summary: String, vararg blocks: DocBlockItem) = DocItem(slug, title, summary, blocks = blocks.toList())
    private val h2 = { id: String, text: String -> DocBlockItem("h2", id = id, text = text) }
    private val p = { text: String -> DocBlockItem("p", text = text) }

    private val budget = doc("budget", "Budget and spending limits", "Set a limit for a category.", h2("limits", "Limits"), p("A **limit** caps what you spend in a month."), h2("rollover", "Rollover"), p("Unspent money can roll over to the next month."))
    private val accounts = doc("accounts", "Accounts, cards and groups", "What an account is.", h2("kinds", "Kinds"), p("Your wallet is an account; a budget is not."))

    @Test fun textIsSplitIntoPlainBoldAndLinks() {
        assertEquals(
            listOf(InlineSegment("Open ", false, null), InlineSegment("Budget", false, "/budget"), InlineSegment(" and set a ", false, null), InlineSegment("limit", true, null), InlineSegment(".", false, null)),
            inlineSegments("Open [Budget](/budget) and set a **limit**."),
        )
        assertEquals("Open Budget and set a limit.", plainText("Open [Budget](/budget) and set a **limit**."))
        assertEquals(listOf(InlineSegment("just text", false, null)), inlineSegments("just text"))
    }

    @Test fun linksLeadToGuidesScreensOrTheWeb() {
        assertEquals(DocLink.Guide("budget"), docLink("/docs/budget"))
        assertEquals(DocLink.App(Target.Tab(3)), docLink("/budget"))
        assertEquals(DocLink.App(Target.Tab(1)), docLink("/transactions/"))
        assertEquals(DocLink.App(Target.Route("net-worth")), docLink("/net-worth"))
        assertEquals(DocLink.App(Target.Route("settings")), docLink("/settings"))
        assertEquals(DocLink.Web, docLink("/import"))
        assertEquals(DocLink.Web, docLink("/somewhere-new"))
    }

    @Test fun searchNeedsEveryWordInAnyOrderAndRanksTheTitleFirst() {
        val docs = listOf(accounts, budget)
        assertEquals(listOf("accounts", "budget"), searchDocs(docs, "").map { it.doc.slug })
        assertEquals(listOf("budget"), searchDocs(docs, "spending limits").map { it.doc.slug })
        assertEquals(listOf("budget"), searchDocs(docs, "LIMITS budget").map { it.doc.slug })
        // "budget" is in both, in the title of one and in the body of the other
        assertEquals(listOf("budget", "accounts"), searchDocs(docs, "budget").map { it.doc.slug })
        assertTrue(searchDocs(docs, "xylophone").isEmpty())
    }

    @Test fun aBodyOnlyMatchPointsAtItsSectionWithAPassage() {
        val hit = searchDocs(listOf(accounts, budget), "unspent money").single()
        assertEquals("budget", hit.doc.slug); assertEquals("rollover", hit.sectionId); assertEquals("Rollover", hit.sectionTitle)
        assertEquals("Unspent money can roll over to the next month.", hit.snippet)
        // found in the title or summary: no passage needed
        val header = searchDocs(listOf(budget), "spending limits").single()
        assertNull(header.snippet); assertNull(header.sectionId)
    }

    @Test fun longPassagesAreCutAtWords() {
        val long = "word ".repeat(100).trim()
        val cut = excerpt(long, 250)
        assertTrue(cut.startsWith("…") && cut.endsWith("…"))
        assertTrue(cut.length < 200)
        assertEquals("short", excerpt("short", 0))
    }

    @Test fun theBundledFileIsReadable() {
        // the file CI keeps in step with the web guides
        val file = listOf("src/main/assets/docs.json", "app/src/main/assets/docs.json").map { File(it) }.first { it.exists() }
        val docs = parseDocs(file.readText())
        assertTrue(docs.size >= 10)
        assertTrue(docs.all { it.slug.isNotBlank() && it.title.isNotBlank() && it.blocks.isNotEmpty() })
        // every link in every guide leads somewhere known: a guide that exists, a screen, or the web
        val slugs = docs.map { it.slug }.toSet()
        docs.flatMap { d -> d.blocks.flatMap { b -> (b.items + listOfNotNull(b.text, b.note, b.title) + b.rows.flatten() + b.faq.flatMap { listOf(it.q, it.a) }) } + d.where.map { "[x](${it.to})" } }
            .flatMap { inlineSegments(it).mapNotNull { s -> s.href } }
            .forEach { href -> val l = docLink(href); if (l is DocLink.Guide) assertTrue("$href points at a guide that does not exist", l.slug in slugs) }
        assertEquals("Budget and spending limits", docs.first { it.slug == "budget" }.title)
        assertEquals(0, parseDocs("not json").size)
    }
}
