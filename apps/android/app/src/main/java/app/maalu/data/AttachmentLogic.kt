package app.maalu.data

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Receipts and web links on a transaction: files (JPEG, PNG, WebP or PDF, up to 10 MB, ten at most) and links (ten at most).
// The server decides the type from the file's bytes and checks every rule again; these only save a trip and say it plainly.

const val MAX_ATTACHMENTS = 10
const val MAX_LINKS = 10
const val MAX_ATTACHMENT_BYTES = 10L * 1024 * 1024

/** The kinds of file the picker offers. */
val ATTACHMENT_TYPES = arrayOf("image/jpeg", "image/png", "image/webp", "application/pdf")

/** "850 B", "42.5 KB", "2.1 MB". */
fun humanSize(bytes: Long): String = when {
    bytes < 1024 -> "$bytes B"
    bytes < 1024 * 1024 -> "${"%.1f".format(bytes / 1024.0)} KB"
    else -> "${"%.1f".format(bytes / 1024.0 / 1024.0)} MB"
}

fun isImageType(mime: String): Boolean = mime.startsWith("image/")

/** What is wrong with adding a file of [size] bytes when [have] are already attached, or null. */
fun attachmentProblem(size: Long, have: Int): String? = when {
    have >= MAX_ATTACHMENTS -> "A transaction can have $MAX_ATTACHMENTS files at most."
    size <= 0 -> "That file is empty."
    size > MAX_ATTACHMENT_BYTES -> "That file is ${humanSize(size)}; the limit is ${humanSize(MAX_ATTACHMENT_BYTES)}."
    else -> null
}

/** The name to show for a link: its title, else the address without the scheme and any trailing slash. */
fun linkLabel(link: TxLink): String = link.title?.takeIf { it.isNotBlank() } ?: link.url.removePrefix("https://").removePrefix("http://").trimEnd('/')

/** The body for `POST /transactions/{id}/links`: an address (the server adds https:// when none is typed) and an optional title. */
fun linkJson(url: String, title: String): JsonObject = buildJsonObject {
    put("url", url.trim())
    title.trim().takeIf { it.isNotEmpty() }?.let { put("title", it) }
}

/** What is wrong with a typed link, or null (the server checks the address itself). */
fun linkProblem(url: String, have: Int): String? = when {
    have >= MAX_LINKS -> "A transaction can have $MAX_LINKS links at most."
    url.isBlank() -> "Type or paste the address."
    url.trim().contains(' ') -> "An address has no spaces."
    else -> null
}

/** "2 files · 1 link", or null when there is nothing. */
fun attachedSummary(files: Int, links: Int): String? = listOfNotNull(
    files.takeIf { it > 0 }?.let { "$it ${if (it == 1) "file" else "files"}" },
    links.takeIf { it > 0 }?.let { "$it ${if (it == 1) "link" else "links"}" },
).joinToString(" · ").ifEmpty { null }
