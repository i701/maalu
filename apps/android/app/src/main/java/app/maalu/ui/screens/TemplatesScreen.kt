@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Account
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Template
import app.maalu.data.formFromTemplate
import app.maalu.data.renameJson
import app.maalu.data.templateNameProblem
import app.maalu.data.templateSummary
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.MorphTile
import app.maalu.ui.theme.Accents
import kotlinx.coroutines.launch

/**
 * Templates: saved starting points for transactions you repeat. Tap one to start a new transaction from it; rename or delete it
 * with the buttons. To change what a template fills in, delete it and save it again from the new-transaction form.
 */
@Composable
fun TemplatesScreen(api: Api) {
    var items by remember { mutableStateOf<List<Template>?>(null) }
    var accounts by remember { mutableStateOf<List<Account>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var using by remember { mutableStateOf<Template?>(null) }
    var renaming by remember { mutableStateOf<Template?>(null) }
    var deleting by remember { mutableStateOf<Template?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    fun say(text: String) { scope.launch { snackbar?.showSnackbar(text) } }

    LaunchedEffect(reload) {
        when (val r = api.get<List<Template>>("templates")) {
            is ApiResult.Ok -> { items = r.data; error = null }
            is ApiResult.Failed -> error = r.message
        }
        (api.get<List<Account>>("accounts") as? ApiResult.Ok)?.let { accounts = it.data }
        refreshing = false
    }

    val list = items
    when {
        list == null && error != null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(error ?: "", color = MaterialTheme.colorScheme.error)
            Button(onClick = { reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
        }
        list == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
            if (list.isEmpty()) Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Outlined.Bookmark, null, Modifier.size(48.dp), tint = Accents.getValue("lime"))
                Text("No templates yet", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Fill in a transaction you repeat, then use the bookmark button at the top of the new-transaction form to save it as a template.",
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            } else LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                itemsIndexed(list, key = { _, t -> t.id }) { i, t ->
                    MorphTile(onClick = { using = t }, first = i == 0, last = i == list.lastIndex, modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.fillMaxWidth().padding(start = 16.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(t.name, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(templateSummary(t), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            }
                            IconButton(onClick = { renaming = t }) { Icon(Icons.Outlined.Edit, "Rename ${t.name}") }
                            IconButton(onClick = { deleting = t }) { Icon(Icons.Outlined.Delete, "Delete ${t.name}") }
                        }
                    }
                }
            }
        }
    }

    using?.let { t ->
        AddTransactionScreen(
            api, initial = formFromTemplate(t, accounts), onClose = { using = null },
            onSaved = { using = null; say("Transaction added") },
        )
    }
    renaming?.let { t -> RenameDialog(api, t, onClose = { renaming = null }, onDone = { renaming = null; reload++; say("Renamed.") }) }
    deleting?.let { t ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Delete ${t.name}?") },
            text = { Text("Transactions made from it are not affected.") },
            confirmButton = {
                TextButton(onClick = {
                    deleting = null
                    scope.launch {
                        when (val r = api.delete("templates/${t.id}")) {
                            is ApiResult.Ok -> { reload++; say("Template deleted.") }
                            is ApiResult.Failed -> say(r.message.lines().first())
                        }
                    }
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Keep it") } },
        )
    }
}

@Composable
private fun RenameDialog(api: Api, t: Template, onClose: () -> Unit, onDone: () -> Unit) {
    var name by remember { mutableStateOf(t.name) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text("Rename template") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                CompactField(name, { name = it; error = null }, "Name", enabled = !busy, isError = error != null)
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                error = templateNameProblem(name)
                if (error != null) return@TextButton
                busy = true
                scope.launch {
                    when (val r = api.patchJson<Template>("templates/${t.id}", renameJson(name).toString())) {
                        is ApiResult.Ok -> onDone()
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Saving…" else "Save") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}
