@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.BrightnessAuto
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.ui.res.painterResource
import app.maalu.R
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import app.maalu.data.ThemeMode
import app.maalu.ui.components.SegmentedPills

private val ThemeMode.icon get() = when (this) {
    ThemeMode.System -> Icons.Outlined.BrightnessAuto
    ThemeMode.Light -> Icons.Outlined.LightMode
    ThemeMode.Dark -> Icons.Outlined.DarkMode
}

/**
 * The sidebar: every destination in the web's groups (Money, Planning, Organise, Help) with its colour, the current
 * one highlighted. Above the list: the mark, Settings and how the app looks; at the bottom, sign out.
 */
@Composable
fun AppDrawer(
    selectedId: String?,
    themeMode: ThemeMode,
    onThemeMode: (ThemeMode) -> Unit,
    onOpen: (Destination) -> Unit,
    onSignOut: () -> Unit,
    /** A count shown at the end of a destination's row, by its id (Pending's waiting salaries). */
    badges: Map<String, Int> = emptyMap(),
) {
    // 272dp, not Material's 360dp, and rows of 44dp, not 56dp: more of the list on screen without scrolling
    ModalDrawerSheet(modifier = Modifier.width(272.dp), drawerContainerColor = MaterialTheme.colorScheme.surfaceContainerLow) {
        // the brand and the theme stay put above the list, so both show whenever the sidebar opens
        Row(Modifier.padding(start = 20.dp, end = 16.dp, top = 16.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            // the bare mark, as on iOS: its own navy in light mode, the icon's pale blue in dark, where navy would vanish
            val dark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
            Icon(painterResource(R.drawable.maalu_mark), null, Modifier.size(40.dp), tint = if (dark) Color(0xFFDFF3FB) else Color(0xFF001D4A))
            Text("Maalu", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
            // Settings is up here, not in the list, so it is in view without scrolling
            val settings = MoreDestinations.first { it.id == "settings" }
            IconButton(onClick = { onOpen(settings) }, shapes = IconButtonDefaults.shapes()) { Icon(settings.icon, settings.label, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
        SegmentedPills(
            ThemeMode.entries.map { it to "${it.label} theme" }, themeMode, onThemeMode,
            modifier = Modifier.padding(horizontal = 12.dp),
            icon = { it.icon },
        )
        HorizontalDivider(Modifier.padding(top = 12.dp, start = 16.dp, end = 16.dp), color = MaterialTheme.colorScheme.outlineVariant)
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 8.dp).padding(bottom = 8.dp)) {
            NavGroup.entries.forEach { group ->
                val items = MoreDestinations.filter { it.group == group && it.inDrawer }
                if (items.isEmpty()) return@forEach
                Text(group.label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 12.dp, top = 10.dp, bottom = 2.dp))
                items.forEach { d ->
                    NavigationDrawerItem(
                        label = { Text(d.label) },
                        icon = { Icon(d.icon, null, modifier = Modifier.size(22.dp)) },
                        selected = d.id == selectedId,
                        onClick = { onOpen(d) },
                        modifier = Modifier.height(44.dp),
                        badge = badges[d.id]?.takeIf { it > 0 }?.let { n -> { androidx.compose.material3.Badge { Text(app.maalu.data.badgeText(n)) } } },
                        colors = NavigationDrawerItemDefaults.colors(unselectedContainerColor = androidx.compose.ui.graphics.Color.Transparent),
                    )
                }
            }
            HorizontalDivider(Modifier.padding(vertical = 8.dp, horizontal = 8.dp), color = MaterialTheme.colorScheme.outlineVariant)
            NavigationDrawerItem(
                label = { Text("Sign out", color = MaterialTheme.colorScheme.error) },
                icon = { Icon(Icons.Outlined.Logout, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(22.dp)) },
                selected = false,
                onClick = onSignOut,
                modifier = Modifier.padding(top = 4.dp).height(44.dp),
                colors = NavigationDrawerItemDefaults.colors(unselectedContainerColor = androidx.compose.ui.graphics.Color.Transparent),
            )
        }
    }
}
