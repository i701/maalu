@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.DoneAll
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberSwipeToDismissBoxState
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.AppNotification
import app.maalu.data.Target
import app.maalu.data.UnreadCount
import app.maalu.data.formatAgo
import app.maalu.data.kindMeta
import app.maalu.data.markRead
import app.maalu.data.targetFor
import app.maalu.ui.components.MorphTile
import app.maalu.ui.theme.Accents
import kotlinx.coroutines.launch
import java.time.Instant

private const val PAGE = 40

/**
 * The notifications page: newest first, unread ones in bold with a dot. Tapping one marks it read and opens the screen it is
 * about; swiping it away dismisses it (the server keeps it so it is not announced again). [onChanged] tells the bell to
 * ask for its count again, [onOpen] goes to a screen.
 */
@Composable
fun NotificationsScreen(api: Api, onOpen: (Target) -> Unit, onChanged: () -> Unit) {
    var items by remember { mutableStateOf<List<AppNotification>?>(null) }
    var total by remember { mutableIntStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var loadingMore by remember { mutableStateOf(false) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    fun say(text: String) { scope.launch { snackbar?.showSnackbar(text) } }

    LaunchedEffect(reload) {
        when (val r = api.get<List<AppNotification>>("notifications", mapOf("limit" to PAGE))) {
            is ApiResult.Ok -> { items = r.data; total = r.total ?: r.data.size; error = null }
            is ApiResult.Failed -> error = r.message
        }
        refreshing = false
    }

    val list = items
    when {
        list == null && error != null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(error ?: "", color = MaterialTheme.colorScheme.error)
            Button(onClick = { reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
        }
        list == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        list.isEmpty() -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Outlined.Notifications, null, Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Nothing needs a look", style = MaterialTheme.typography.titleMedium)
                Text("Late payments, budgets close to their limit and reached goals show up here.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
        }
        else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                item {
                    Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        val unread = list.count { it.unread }
                        Text(if (unread == 0) "All caught up" else "$unread unread", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f).padding(start = 4.dp))
                        if (unread > 0) TextButton(onClick = {
                            scope.launch {
                                when (val r = api.postJson<UnreadCount>("notifications/read-all", "{}")) {
                                    is ApiResult.Ok -> { val now = Instant.now().toString(); items = list.map { it.copy(readAt = it.readAt ?: now) }; onChanged() }
                                    is ApiResult.Failed -> say(r.message.lines().first())
                                }
                            }
                        }) { Icon(Icons.Outlined.DoneAll, null, Modifier.padding(end = 6.dp).size(18.dp)); Text("Mark all read") }
                    }
                }
                items(list, key = { it.id }) { n ->
                    val index = list.indexOf(n)
                    SwipeRow(
                        n, first = index == 0, last = index == list.lastIndex,
                        onOpen = {
                            if (n.unread) scope.launch {
                                // read at once on screen; the server catches up
                                items = markRead(list, n.id, Instant.now().toString()); onChanged()
                                api.postJson<AppNotification>("notifications/${n.id}/read", "{}")
                            }
                            targetFor(n.link)?.let(onOpen)
                        },
                        onDismiss = {
                            scope.launch {
                                when (val r = api.delete("notifications/${n.id}")) {
                                    is ApiResult.Ok -> { items = list.filter { it.id != n.id }; total -= 1; onChanged() }
                                    is ApiResult.Failed -> say(r.message.lines().first())
                                }
                            }
                        },
                    )
                }
                if (list.size < total) item {
                    TextButton(
                        onClick = {
                            loadingMore = true
                            scope.launch {
                                when (val r = api.get<List<AppNotification>>("notifications", mapOf("limit" to PAGE, "offset" to list.size))) {
                                    is ApiResult.Ok -> items = list + r.data.filter { m -> list.none { it.id == m.id } }
                                    is ApiResult.Failed -> say(r.message.lines().first())
                                }
                                loadingMore = false
                            }
                        },
                        enabled = !loadingMore, modifier = Modifier.fillMaxWidth(),
                    ) { Text(if (loadingMore) "Loading…" else "Show older") }
                }
            }
        }
    }
}

@Composable
private fun SwipeRow(n: AppNotification, first: Boolean, last: Boolean, onOpen: () -> Unit, onDismiss: () -> Unit) {
    val state = rememberSwipeToDismissBoxState(confirmValueChange = { value ->
        if (value == SwipeToDismissBoxValue.EndToStart) { onDismiss(); true } else false
    })
    SwipeToDismissBox(
        state = state, enableDismissFromStartToEnd = false,
        backgroundContent = {
            // only while swiping: at rest it would show as a pink fringe behind the tile's rounded corners
            if (state.dismissDirection == SwipeToDismissBoxValue.EndToStart) Box(Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.errorContainer).padding(end = 20.dp), contentAlignment = Alignment.CenterEnd) {
                Icon(Icons.Outlined.Delete, "Dismiss", tint = MaterialTheme.colorScheme.onErrorContainer)
            }
        },
    ) { NotificationRow(n, first, last, onOpen) }
}

@Composable
private fun NotificationRow(n: AppNotification, first: Boolean, last: Boolean, onOpen: () -> Unit) {
    val meta = kindMeta(n.kind)
    val tint = if (meta.accent == "error") MaterialTheme.colorScheme.error else Accents.getValue(meta.accent)
    MorphTile(onClick = onOpen, first = first, last = last, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
            Box(Modifier.size(40.dp).clip(RoundedCornerShape(14.dp)).background(tint.copy(alpha = 0.22f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.Notifications, null, tint = tint)
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(n.title, style = MaterialTheme.typography.bodyLarge, fontWeight = if (n.unread) FontWeight.SemiBold else FontWeight.Normal)
                if (n.body.isNotBlank()) Text(n.body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("${meta.label} · ${formatAgo(n.createdAt)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (n.unread) Box(Modifier.padding(top = 6.dp).size(10.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
        }
    }
}
