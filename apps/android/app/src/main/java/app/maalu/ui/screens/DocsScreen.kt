@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import app.maalu.data.DocBlockItem
import app.maalu.data.DocHit
import app.maalu.data.DocItem
import app.maalu.data.DocLink
import app.maalu.data.Target
import app.maalu.data.docLink
import app.maalu.data.inlineSegments
import app.maalu.data.parseDocs
import app.maalu.data.searchDocs
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.MorphTile
import app.maalu.ui.theme.Accents

/**
 * Docs: guides to what each feature is and how to use it. They are the web's guides, bundled in the app (assets/docs.json, kept in step by
 * CI), so they read offline. The open guide is held by the caller ([slug]), which shows a back arrow in the top bar. Search finds guides that contain every word typed, in any order. A link in a guide opens that screen or another
 * guide; a page the app does not have (Import) is shown as plain text.
 */
@Composable
fun DocsScreen(slug: String?, onSlug: (String?) -> Unit, onOpenApp: (Target) -> Unit) {
    val context = LocalContext.current
    val docs = remember { runCatching { context.assets.open("docs.json").bufferedReader().use { it.readText() } }.getOrDefault("").let(::parseDocs) }
    var section by rememberSaveable { mutableStateOf<String?>(null) }
    var query by rememberSaveable { mutableStateOf("") }
    val open = docs.firstOrNull { it.slug == slug }
    BackHandler(enabled = open != null) { onSlug(null); section = null }

    if (open == null) {
        val hits = remember(query) { searchDocs(docs, query) }
        GuideList(docs.isEmpty(), hits, query, onQuery = { query = it }, onOpen = { hit -> onSlug(hit.doc.slug); section = hit.sectionId })
    } else Article(
        open, section,
        onLink = { href ->
            when (val l = docLink(href)) {
                is DocLink.Guide -> if (docs.any { it.slug == l.slug }) { onSlug(l.slug); section = null }
                is DocLink.App -> onOpenApp(l.target)
                DocLink.Web -> {}
            }
        },
    )
}

@Composable
private fun GuideList(empty: Boolean, hits: List<DocHit>, query: String, onQuery: (String) -> Unit, onOpen: (DocHit) -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        item { Box(Modifier.padding(bottom = 10.dp)) { CompactField(query, onQuery, "Search the guides") } }
        if (empty) item { Text("The guides could not be loaded.", color = MaterialTheme.colorScheme.error) }
        else if (hits.isEmpty()) item { Text("No guide has all of those words.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        itemsIndexed(hits, key = { _, h -> h.doc.slug }) { i, hit ->
            val tint = Accents[hit.doc.accent] ?: MaterialTheme.colorScheme.primary
            MorphTile(onClick = { onOpen(hit) }, first = i == 0, last = i == hits.lastIndex, modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                    Box(Modifier.size(40.dp).clip(RoundedCornerShape(14.dp)).background(tint.copy(alpha = 0.22f)), contentAlignment = Alignment.Center) {
                        Icon(Icons.AutoMirrored.Outlined.Article, null, tint = tint)
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text(hit.doc.title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                        Text(hit.doc.summary, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3, overflow = TextOverflow.Ellipsis)
                        if (hit.snippet != null) Text(
                            (hit.sectionTitle?.let { "$it: " } ?: "") + hit.snippet, style = MaterialTheme.typography.labelSmall,
                            color = tint, maxLines = 3, overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun Article(doc: DocItem, section: String?, onLink: (String) -> Unit) {
    val tint = Accents[doc.accent] ?: MaterialTheme.colorScheme.primary
    val state = rememberLazyListState()
    // a search that found the words in the body lands on that section (the header and summary are the first two items)
    LaunchedEffect(doc.slug, section) {
        val at = doc.blocks.indexOfFirst { it.type == "h2" && it.id == section }
        if (section != null && at >= 0) state.scrollToItem(at + 2 + (if (doc.webOnly) 1 else 0)) else state.scrollToItem(0)
    }
    LazyColumn(Modifier.fillMaxSize(), state = state, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(doc.title, style = MaterialTheme.typography.headlineSmall) }
        item { Text(doc.summary, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        if (doc.webOnly) item {
            Surface(shape = MaterialTheme.shapes.large, color = Accents.getValue("amber").copy(alpha = 0.14f)) {
                Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Outlined.Info, null, tint = Accents.getValue("amber"), modifier = Modifier.size(22.dp))
                    Text("This is done in the web app, not in this one. The guide is here so you can read how it works.", style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
        items(doc.blocks) { block -> Block(block, tint, onLink) }
        if (doc.where.isNotEmpty()) {
            item { Text("Where to find it", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp)) }
            items(doc.where) { w ->
                val link = docLink(w.to)
                OutlinedButton(onClick = { onLink(w.to) }, enabled = link != DocLink.Web, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth()) {
                    Text(w.label + if (link == DocLink.Web) " (on the web)" else "")
                }
            }
        }
        if (doc.extras.isNotEmpty()) item {
            Text(
                "The web version of this guide also has: " + doc.extras.joinToString("; ") { it.replaceFirstChar { c -> c.lowercase() } } + ".",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp),
            )
        }
    }
}

/** Guide text as styled text: **bold** is bold, [label](/page) is a link that opens that page. */
@Composable
private fun inline(text: String, tint: Color, onLink: (String) -> Unit): AnnotatedString = buildAnnotatedString {
    val linkStyle = TextLinkStyles(SpanStyle(color = tint, textDecoration = TextDecoration.Underline))
    inlineSegments(text).forEach { seg ->
        when {
            seg.href != null && docLink(seg.href) != DocLink.Web -> withLink(LinkAnnotation.Clickable(seg.href, linkStyle) { onLink(seg.href) }) { append(seg.text) }
            seg.bold -> withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(seg.text) }
            else -> append(seg.text)
        }
    }
}

@Composable
private fun Block(b: DocBlockItem, tint: Color, onLink: (String) -> Unit) {
    when (b.type) {
        "h2" -> Text(b.text.orEmpty(), style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 10.dp))
        "p" -> Text(inline(b.text.orEmpty(), tint, onLink), style = MaterialTheme.typography.bodyMedium)
        "steps" -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            b.items.forEachIndexed { i, item ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(Modifier.size(24.dp).background(tint.copy(alpha = 0.22f), CircleShape), contentAlignment = Alignment.Center) { Text("${i + 1}", style = MaterialTheme.typography.labelMedium) }
                    Text(inline(item, tint, onLink), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                }
            }
        }
        "list" -> Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            b.items.forEach { item -> Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { Text("•", style = MaterialTheme.typography.bodyMedium); Text(inline(item, tint, onLink), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f)) } }
        }
        "callout" -> {
            val (icon, color) = when (b.tone) {
                "warning" -> Icons.Outlined.ErrorOutline to Accents.getValue("amber")
                "tip" -> Icons.Outlined.Lightbulb to Accents.getValue("green")
                else -> Icons.Outlined.Info to Accents.getValue("blue")
            }
            Surface(shape = MaterialTheme.shapes.large, color = color.copy(alpha = 0.14f)) {
                Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(icon, null, tint = color, modifier = Modifier.size(22.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        b.title?.let { Text(it, style = MaterialTheme.typography.titleSmall) }
                        Text(inline(b.text.orEmpty(), tint, onLink), style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
        "example" -> Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerHigh) {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(b.title.orEmpty(), style = MaterialTheme.typography.titleSmall)
                b.rows.forEach { row ->
                    // two columns with fixed shares: a long value wraps in its own column instead of squeezing the label to a letter wide
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(row.getOrElse(0) { "" }, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(0.42f))
                        Text(row.getOrElse(1) { "" }, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, textAlign = androidx.compose.ui.text.style.TextAlign.End, modifier = Modifier.weight(0.58f))
                    }
                }
                b.note?.let { Text(inline(it, tint, onLink), style = MaterialTheme.typography.bodySmall, fontStyle = FontStyle.Italic, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
        "faq" -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            b.faq.forEachIndexed { i, f ->
                if (i > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                Text(f.q, style = MaterialTheme.typography.titleSmall)
                Text(inline(f.a, tint, onLink), style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
