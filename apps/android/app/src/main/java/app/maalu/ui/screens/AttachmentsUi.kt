package app.maalu.ui.screens

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddAPhoto
import androidx.compose.material.icons.outlined.AttachFile
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.PictureAsPdf
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.FileProvider
import app.maalu.data.ATTACHMENT_TYPES
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Attachment
import app.maalu.data.Transaction
import app.maalu.data.TxLink
import app.maalu.data.attachmentProblem
import app.maalu.data.humanSize
import app.maalu.data.isImageType
import app.maalu.data.linkJson
import app.maalu.data.linkLabel
import app.maalu.data.linkProblem
import app.maalu.ui.components.CompactField
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

// Receipts and links on a transaction: photos and PDFs go up as the request body, links are only ever opened in the browser.
// The files are shown here (a photo in the app, a PDF in whatever app opens PDFs); nothing is kept on the phone beyond the cache.

/** A file the person picked or photographed, read into memory (at most 10 MB, which the caller checks). */
class PickedFile(val name: String, val bytes: ByteArray)

/** Reads what the file picker returned. Null when it cannot be read. */
suspend fun readPicked(context: Context, uri: Uri): PickedFile? = withContext(Dispatchers.IO) {
    try {
        val name = context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) c.getString(0) else null
        } ?: uri.lastPathSegment ?: "receipt"
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return@withContext null
        PickedFile(name, bytes)
    } catch (e: Exception) {
        null
    }
}

/** A new empty file in the cache for the camera to write to, and the content address to hand the camera. */
fun newPhotoTarget(context: Context): Pair<File, Uri> {
    val dir = File(context.cacheDir, "receipts").apply { mkdirs() }
    val file = File(dir, "photo-${System.currentTimeMillis()}.jpg")
    return file to FileProvider.getUriForFile(context, "${context.packageName}.files", file)
}

/** The three ways to add something: take a photo, pick a file, add a link. [onFile] gets what was picked, [onLink] asks for the link dialog. */
@Composable
fun AddReceiptButtons(enabled: Boolean, onFile: (PickedFile) -> Unit, onProblem: (String) -> Unit, onLink: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var photo by remember { mutableStateOf<Pair<File, Uri>?>(null) }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        val target = photo
        photo = null
        if (ok && target != null) scope.launch {
            val bytes = withContext(Dispatchers.IO) { runCatching { target.first.readBytes() }.getOrNull() }
            withContext(Dispatchers.IO) { target.first.delete() }
            if (bytes == null) onProblem("The photo could not be read.") else onFile(PickedFile("receipt-${System.currentTimeMillis() / 1000}.jpg", bytes))
        }
    }
    val files = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch { readPicked(context, uri)?.let(onFile) ?: onProblem("That file could not be read.") }
    }
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(enabled = enabled, onClick = {
            val target = newPhotoTarget(context)
            photo = target
            try { camera.launch(target.second) } catch (e: ActivityNotFoundException) { photo = null; onProblem("There is no camera app on this device.") }
        }) { Icon(Icons.Outlined.AddAPhoto, null, Modifier.padding(end = 6.dp).size(18.dp)); Text("Photo") }
        OutlinedButton(enabled = enabled, onClick = { files.launch(ATTACHMENT_TYPES) }) { Icon(Icons.Outlined.AttachFile, null, Modifier.padding(end = 6.dp).size(18.dp)); Text("File") }
        OutlinedButton(enabled = enabled, onClick = onLink) { Icon(Icons.Outlined.Link, null, Modifier.padding(end = 6.dp).size(18.dp)); Text("Link") }
    }
}

/** Asks for a web link: the address and an optional title. */
@Composable
fun AddLinkDialog(have: Int, onClose: () -> Unit, onAdd: (url: String, title: String) -> Unit) {
    var url by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text("Add a web link") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("An online receipt or order page. It is only opened when you tap it; Maalu never visits it.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                CompactField(url, { url = it; error = null }, "Address, for example shop.example/order/123", isError = error != null)
                CompactField(title, { title = it }, "Title (optional)")
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                error = linkProblem(url, have)
                if (error == null) onAdd(url, title)
            }) { Text("Add") }
        },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancel") } },
    )
}

/** Opens a link in the browser; a phone with no browser gets a plain message. */
fun openLink(context: Context, url: String, say: (String) -> Unit) {
    try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    catch (e: ActivityNotFoundException) { say("There is no browser to open that.") }
}

/**
 * What is attached to a saved transaction: its files and links, each tappable, with buttons to add more. Changes go to the server at once;
 * [onChanged] lets the list behind the sheet refresh its paperclip.
 */
@Composable
fun ReceiptsSection(api: Api, t: Transaction, onChanged: () -> Unit, say: (String) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var files by remember(t.id) { mutableStateOf(emptyList<Attachment>()) }
    var links by remember(t.id) { mutableStateOf(emptyList<TxLink>()) }
    var reload by remember { mutableIntStateOf(0) }
    var busy by remember { mutableStateOf(false) }
    var viewing by remember { mutableStateOf<Attachment?>(null) }
    var removingFile by remember { mutableStateOf<Attachment?>(null) }
    var removingLink by remember { mutableStateOf<TxLink?>(null) }
    var addingLink by remember { mutableStateOf(false) }

    LaunchedEffect(t.id, reload) {
        if (t.attachmentCount > 0 || reload > 0) (api.get<List<Attachment>>("transactions/${t.id}/attachments") as? ApiResult.Ok)?.let { files = it.data }
        if (t.linkCount > 0 || reload > 0) (api.get<List<TxLink>>("transactions/${t.id}/links") as? ApiResult.Ok)?.let { links = it.data }
    }
    fun changed() { reload++; onChanged() }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Receipts and links", style = MaterialTheme.typography.titleSmall)
        files.forEach { a ->
            Surface(onClick = { viewing = a }, shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(start = 12.dp, top = 2.dp, bottom = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(if (isImageType(a.mimeType)) Icons.Outlined.Image else Icons.Outlined.PictureAsPdf, null, tint = MaterialTheme.colorScheme.primary)
                    Column(Modifier.weight(1f)) {
                        Text(a.filename, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(humanSize(a.size), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = { removingFile = a }, enabled = !busy) { Icon(Icons.Outlined.Delete, "Remove ${a.filename}") }
                }
            }
        }
        links.forEach { l ->
            Surface(onClick = { openLink(context, l.url, say) }, shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(start = 12.dp, top = 2.dp, bottom = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Outlined.Link, null, tint = MaterialTheme.colorScheme.tertiary)
                    Text(linkLabel(l), Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    IconButton(onClick = { removingLink = l }, enabled = !busy) { Icon(Icons.Outlined.Delete, "Remove ${linkLabel(l)}") }
                }
            }
        }
        if (busy) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp); Text("Uploading…", style = MaterialTheme.typography.bodySmall)
        }
        AddReceiptButtons(
            enabled = !busy,
            onProblem = say,
            onFile = { picked ->
                val problem = attachmentProblem(picked.bytes.size.toLong(), files.size)
                if (problem != null) { say(problem); return@AddReceiptButtons }
                busy = true
                scope.launch {
                    when (val r = api.upload<Attachment>("transactions/${t.id}/attachments", picked.name, picked.bytes)) {
                        is ApiResult.Ok -> { say("Attached ${picked.name}."); changed() }
                        is ApiResult.Failed -> say(r.message.lines().first())
                    }
                    busy = false
                }
            },
            onLink = { addingLink = true },
        )
    }

    viewing?.let { a -> ReceiptViewer(api, a, onClose = { viewing = null }, say = say) }
    if (addingLink) AddLinkDialog(links.size, onClose = { addingLink = false }, onAdd = { url, title ->
        addingLink = false; busy = true
        scope.launch {
            when (val r = api.postJson<TxLink>("transactions/${t.id}/links", linkJson(url, title).toString())) {
                is ApiResult.Ok -> { say("Link added."); changed() }
                is ApiResult.Failed -> say(r.message.lines().first())
            }
            busy = false
        }
    })
    removingFile?.let { a ->
        AlertDialog(
            onDismissRequest = { removingFile = null },
            title = { Text("Remove this file?") },
            text = { Text("${a.filename} is deleted for good. This can't be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    removingFile = null; busy = true
                    scope.launch {
                        when (val r = api.delete("attachments/${a.id}")) {
                            is ApiResult.Ok -> { say("Removed ${a.filename}."); changed() }
                            is ApiResult.Failed -> say(r.message.lines().first())
                        }
                        busy = false
                    }
                }) { Text("Remove", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { removingFile = null }) { Text("Keep it") } },
        )
    }
    removingLink?.let { l ->
        AlertDialog(
            onDismissRequest = { removingLink = null },
            title = { Text("Remove this link?") },
            text = { Text(linkLabel(l)) },
            confirmButton = {
                TextButton(onClick = {
                    removingLink = null; busy = true
                    scope.launch {
                        when (val r = api.delete("links/${l.id}")) {
                            is ApiResult.Ok -> { say("Link removed."); changed() }
                            is ApiResult.Failed -> say(r.message.lines().first())
                        }
                        busy = false
                    }
                }) { Text("Remove", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { removingLink = null }) { Text("Keep it") } },
        )
    }
}

/** Shows a receipt: a photo full screen, to pinch and drag; a PDF is handed to whatever app opens PDFs. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReceiptViewer(api: Api, a: Attachment, onClose: () -> Unit, say: (String) -> Unit) {
    val context = LocalContext.current
    var bitmap by remember(a.id) { mutableStateOf<androidx.compose.ui.graphics.ImageBitmap?>(null) }
    var failed by remember(a.id) { mutableStateOf<String?>(null) }
    LaunchedEffect(a.id) {
        val (bytes, why) = api.bytes("attachments/${a.id}")
        if (bytes == null) { failed = why; return@LaunchedEffect }
        if (isImageType(a.mimeType)) {
            val decoded = withContext(Dispatchers.Default) { BitmapFactory.decodeByteArray(bytes, 0, bytes.size) }
            if (decoded == null) failed = "That image could not be shown." else bitmap = decoded.asImageBitmap()
        } else {
            val file = withContext(Dispatchers.IO) {
                File(context.cacheDir, "receipts").apply { mkdirs() }.let { dir -> File(dir, "${a.id}.pdf").also { it.writeBytes(bytes) } }
            }
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
            try {
                context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e: ActivityNotFoundException) {
                say("There is no app on this device that opens PDFs.")
            }
            onClose()
        }
    }
    if (!isImageType(a.mimeType) && failed == null) return
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Scaffold(topBar = { TopAppBar(title = { Text(a.filename, maxLines = 1, overflow = TextOverflow.Ellipsis) }, navigationIcon = { IconButton(onClick = onClose) { Icon(Icons.Outlined.Close, "Close") } }) }) { padding ->
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                val image = bitmap
                when {
                    failed != null -> Text(failed ?: "", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(24.dp))
                    image == null -> CircularProgressIndicator()
                    else -> {
                        var scale by remember { mutableStateOf(1f) }
                        var offsetX by remember { mutableStateOf(0f) }
                        var offsetY by remember { mutableStateOf(0f) }
                        Image(
                            bitmap = image, contentDescription = a.filename, contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize().pointerInput(Unit) {
                                detectTransformGestures { _, pan, zoom, _ ->
                                    scale = (scale * zoom).coerceIn(1f, 6f)
                                    if (scale == 1f) { offsetX = 0f; offsetY = 0f } else { offsetX += pan.x; offsetY += pan.y }
                                }
                            }.graphicsLayer(scaleX = scale, scaleY = scale, translationX = offsetX, translationY = offsetY),
                        )
                    }
                }
            }
        }
    }
}
