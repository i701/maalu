@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Article
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.BrightnessAuto
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Checklist
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.EventRepeat
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.ShowChart
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.TaskAlt
import androidx.compose.material3.Badge
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.ButtonDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.ThemeMode
import app.maalu.data.badgeText
import app.maalu.ui.components.MorphTile
import app.maalu.ui.components.SegmentedPills

/** The groups of the More tab, in order; [App] holds screens reached from a button, which More does not list. */
enum class NavGroup(val label: String) { Planning("Planning"), Reports("Reports"), Organise("Organise"), Help("Help"), App("This app") }

/** One place in the app that is not in the bottom bar. */
data class Destination(val id: String, val label: String, val icon: ImageVector, val group: NavGroup)

val MoreDestinations: List<Destination> = listOf(
    Destination("plan", "Month plan", Icons.Outlined.Checklist, NavGroup.Planning),
    Destination("pending", "Pending", Icons.Outlined.TaskAlt, NavGroup.Planning),
    Destination("subscriptions", "Subscriptions", Icons.Outlined.EventRepeat, NavGroup.Planning),
    Destination("net-worth", "Net worth", Icons.Outlined.ShowChart, NavGroup.Reports),
    Destination("compare", "Compare", Icons.Outlined.Insights, NavGroup.Reports),
    Destination("trends", "Trends", Icons.Outlined.CalendarMonth, NavGroup.Reports),
    Destination("places", "Places", Icons.Outlined.LocationOn, NavGroup.Reports),
    Destination("categories", "Categories", Icons.Outlined.Category, NavGroup.Organise),
    Destination("vendors", "Vendors", Icons.Outlined.Storefront, NavGroup.Organise),
    Destination("tags", "Tags", Icons.Outlined.Sell, NavGroup.Organise),
    Destination("groups", "Groups", Icons.Outlined.Inventory2, NavGroup.Organise),
    Destination("templates", "Templates", Icons.Outlined.Bookmark, NavGroup.Organise),
    Destination("trash", "Trash", Icons.Outlined.Delete, NavGroup.Organise),
    Destination("docs", "Docs", Icons.Outlined.Article, NavGroup.Help),
    Destination("settings", "Settings", Icons.Outlined.Settings, NavGroup.App),
    Destination("notifications", "Notifications", Icons.Outlined.Notifications, NavGroup.App),
)

fun destinationById(id: String?): Destination? = MoreDestinations.firstOrNull { it.id == id }

private val ThemeMode.icon get() = when (this) {
    ThemeMode.System -> Icons.Outlined.BrightnessAuto
    ThemeMode.Light -> Icons.Outlined.LightMode
    ThemeMode.Dark -> Icons.Outlined.DarkMode
}

/**
 * The More tab: how the app looks, then everything the bottom bar does not hold, as tiles two across in short named groups,
 * and sign out at the end. [badges] counts what waits on a destination, by its id.
 */
@Composable
fun MoreScreen(themeMode: ThemeMode, onThemeMode: (ThemeMode) -> Unit, onOpen: (Destination) -> Unit, onSignOut: () -> Unit, badges: Map<String, Int> = emptyMap()) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SegmentedPills(ThemeMode.entries.map { it to "${it.label} theme" }, themeMode, onThemeMode, icon = { it.icon })
        NavGroup.entries.filter { it != NavGroup.App }.forEach { group ->
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(group.label, Modifier.padding(start = 4.dp), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                MoreDestinations.filter { it.group == group }.chunked(2).forEach { pair ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        pair.forEach { d -> MoreTile(d, badges[d.id] ?: 0, Modifier.weight(1f)) { onOpen(d) } }
                        // a lone tile keeps the width of the others
                        if (pair.size == 1) Box(Modifier.weight(1f))
                    }
                }
            }
        }
        TextButton(onClick = onSignOut, shapes = ButtonDefaults.shapes(), modifier = Modifier.align(Alignment.CenterHorizontally), colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)) {
            Icon(Icons.Outlined.Logout, null, Modifier.padding(end = 8.dp).size(20.dp)); Text("Sign out")
        }
    }
}

@Composable
private fun MoreTile(d: Destination, waiting: Int, modifier: Modifier, onClick: () -> Unit) {
    MorphTile(onClick, first = true, last = true, modifier = modifier) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(d.icon, null, tint = MaterialTheme.colorScheme.primary)
            Text(d.label, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (waiting > 0) Badge { Text(badgeText(waiting)) }
        }
    }
}
