package app.maalu.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// The guides. They are written once, for the web (apps/web/src/lib/docs), and bundled here as assets/docs.json, which `just docs-json`
// generates and CI keeps up to date. This reads that file, searches it and turns the links in the text into screens.

@Serializable
data class DocsFile(val version: Int = 1, val docs: List<DocItem> = emptyList())

@Serializable
data class DocWhere(val to: String, val label: String)

@Serializable
data class FaqItem(val q: String, val a: String)

/** One piece of a guide. Which fields are set depends on [type]: h2 (id, text), p (text), steps and list (items), callout (tone, title, text), example (title, rows, note), faq (faq). */
@Serializable
data class DocBlockItem(
    val type: String,
    val id: String? = null,
    val text: String? = null,
    val items: List<String> = emptyList(),
    val tone: String? = null,
    val title: String? = null,
    val rows: List<List<String>> = emptyList(),
    val note: String? = null,
    val faq: List<FaqItem> = emptyList(),
)

@Serializable
data class DocItem(
    val slug: String,
    val title: String,
    val summary: String,
    val accent: String = "blue",
    val where: List<DocWhere> = emptyList(),
    val blocks: List<DocBlockItem> = emptyList(),
    /** What the web guide has that this copy leaves out (live examples, screenshots). */
    val extras: List<String> = emptyList(),
    /** The feature is only in the web app (the guide is kept so it can still be read). */
    val webOnly: Boolean = false,
)

private val DocsJson = Json { ignoreUnknownKeys = true }

/** Reads the bundled guides; an unreadable file gives no guides rather than a crash. */
fun parseDocs(json: String): List<DocItem> = runCatching { DocsJson.decodeFromString(DocsFile.serializer(), json).docs }.getOrDefault(emptyList())

// ---- Text: **bold** and [label](/page) ------------------------------------------------------------------------------------

/** A piece of a guide's text: plain, bold, or a link to a page. */
data class InlineSegment(val text: String, val bold: Boolean, val href: String?)

private val InlinePattern = Regex("""(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))""")
private val LinkPattern = Regex("""^\[([^\]]+)\]\(([^)\s]+)\)$""")

fun inlineSegments(text: String): List<InlineSegment> {
    val out = mutableListOf<InlineSegment>()
    var last = 0
    for (m in InlinePattern.findAll(text)) {
        if (m.range.first > last) out += InlineSegment(text.substring(last, m.range.first), false, null)
        val part = m.value
        val link = LinkPattern.find(part)
        out += when {
            link != null -> InlineSegment(link.groupValues[1], false, link.groupValues[2])
            else -> InlineSegment(part.removeSurrounding("**"), true, null)
        }
        last = m.range.last + 1
    }
    if (last < text.length) out += InlineSegment(text.substring(last), false, null)
    return out
}

/** The text a reader sees: link markup becomes its label and `**` goes. */
fun plainText(text: String): String = text.replace(Regex("""\[([^\]]+)\]\([^)\s]+\)"""), "$1").replace("**", "")

// ---- Links -----------------------------------------------------------------------------------------------------------------

/** Where a link in a guide leads in this app. */
sealed interface DocLink {
    data class Guide(val slug: String) : DocLink
    data class App(val target: Target) : DocLink
    /** A page the app does not have (Import is on the web only). */
    data object Web : DocLink
}

private val Tabs = mapOf("/dashboard" to 0, "/transactions" to 1, "/accounts" to 2, "/budget" to 3)
private val Routes = setOf("plan", "pending", "subscriptions", "categories", "tags", "groups", "templates", "trash", "vendors", "settings", "net-worth", "compare", "trends", "places", "notifications", "docs")

fun docLink(href: String): DocLink {
    val path = href.trim().substringBefore("?").trimEnd('/')
    Regex("^/docs/([a-z0-9-]+)$").find(path)?.let { return DocLink.Guide(it.groupValues[1]) }
    Tabs[path]?.let { return DocLink.App(Target.Tab(it)) }
    val id = path.removePrefix("/")
    return if (id in Routes) DocLink.App(Target.Route(id)) else DocLink.Web
}

// ---- Search ----------------------------------------------------------------------------------------------------------------

/** A guide that matched, and where: the section and a passage from the body when the words were found there rather than only in the title or summary. */
data class DocHit(val doc: DocItem, val sectionId: String?, val sectionTitle: String?, val snippet: String?)

private const val SNIPPET = 160

private fun blockTexts(b: DocBlockItem): List<String> = when (b.type) {
    "h2", "p" -> listOfNotNull(b.text)
    "steps", "list" -> b.items
    "callout" -> listOfNotNull(b.title, b.text)
    "example" -> listOfNotNull(b.title) + b.rows.flatten() + listOfNotNull(b.note)
    "faq" -> b.faq.flatMap { listOf(it.q, it.a) }
    else -> emptyList()
}

/** About [SNIPPET] characters of [text] around position [at], cut at word boundaries. */
fun excerpt(text: String, at: Int): String {
    if (text.length <= SNIPPET) return text
    var start = maxOf(0, at - SNIPPET / 3)
    if (start > 0) { val i = text.indexOf(' ', start); start = if (i >= 0) i + 1 else start }
    var end = minOf(text.length, start + SNIPPET)
    if (end < text.length) { val i = text.lastIndexOf(' ', end); if (i > start) end = i }
    return (if (start > 0) "…" else "") + text.substring(start, end).trim() + (if (end < text.length) "…" else "")
}

/**
 * The guides that contain every word of [query] (in any order, ignoring case and formatting), best first: words in the title count most,
 * then the summary, then how often the body mentions them. Ties keep the guides' own order. An empty query returns every guide as it is.
 */
fun searchDocs(docs: List<DocItem>, query: String): List<DocHit> {
    val words = plainText(query).lowercase().split(Regex("\\s+")).filter { it.isNotEmpty() }
    if (words.isEmpty()) return docs.map { DocHit(it, null, null, null) }
    class Passage(val sectionId: String?, val sectionTitle: String?, val text: String, val folded: String)
    val scored = mutableListOf<Pair<DocHit, Int>>()
    for (doc in docs) {
        val title = plainText(doc.title).lowercase(); val summary = plainText(doc.summary).lowercase()
        var sectionId: String? = null; var sectionTitle: String? = null
        val passages = mutableListOf<Passage>()
        for (b in doc.blocks) {
            if (b.type == "h2") { sectionId = b.id; sectionTitle = b.text }
            for (t in blockTexts(b)) { val shown = plainText(t); passages += Passage(sectionId, sectionTitle, shown, shown.lowercase()) }
        }
        val everything = (listOf(title, summary) + passages.map { it.folded }).joinToString("\n")
        if (!words.all { it in everything }) continue
        val inBody = passages.filter { p -> words.any { it in p.folded } }
        val score = words.count { it in title } * 10 + words.count { it in summary } * 3 + inBody.size
        val headerHasAll = words.all { it in title || it in summary }
        val best = if (headerHasAll) null else inBody.fold(null as Passage?) { top, p ->
            val count = { x: Passage -> words.count { it in x.folded } }
            if (top == null || count(p) > count(top)) p else top
        }
        val first = best?.let { b -> words.map { b.folded.indexOf(it) }.filter { it >= 0 }.minOrNull() } ?: 0
        scored += DocHit(doc, best?.sectionId, best?.sectionTitle, best?.let { excerpt(it.text, first) }) to score
    }
    return scored.sortedByDescending { it.second }.map { it.first }
}
