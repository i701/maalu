@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import app.maalu.ui.theme.tintIcon
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.maalu.data.ThemeMode
import app.maalu.ui.components.SegmentedPills
import app.maalu.ui.theme.Accents

/**
 * The sidebar: every destination in the web's groups (Money, Planning, Organise, Help) with its colour, the current
 * one highlighted, and at the bottom how the app looks, who you are signed in to, and sign out.
 */
@Composable
fun AppDrawer(
    server: String,
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
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 8.dp).padding(bottom = 8.dp)) {
            // the brand: a tinted tile with the initial, the name, and where this app is signed in
            Row(Modifier.padding(start = 12.dp, top = 16.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.size(32.dp).clip(RoundedCornerShape(11.dp)).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                    Text("M", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onPrimaryContainer, fontWeight = FontWeight.Bold)
                }
                Column {
                    Text("Maalu", style = MaterialTheme.typography.titleMedium)
                    Text(server, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
            }
            NavGroup.entries.forEach { group ->
                val items = MoreDestinations.filter { it.group == group && it.inDrawer }
                if (items.isEmpty()) return@forEach
                Text(group.label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 12.dp, top = 10.dp, bottom = 2.dp))
                items.forEach { d ->
                    val tint = Accents.getValue(d.accent)
                    NavigationDrawerItem(
                        label = { Text(d.label) },
                        icon = { Icon(d.icon, null, tint = tint, modifier = Modifier.size(22.dp)) },
                        selected = d.id == selectedId,
                        onClick = { onOpen(d) },
                        modifier = Modifier.height(44.dp),
                        badge = badges[d.id]?.takeIf { it > 0 }?.let { n -> { androidx.compose.material3.Badge { Text(app.maalu.data.badgeText(n)) } } },
                        colors = NavigationDrawerItemDefaults.colors(selectedContainerColor = tint.tintIcon(), unselectedContainerColor = androidx.compose.ui.graphics.Color.Transparent),
                    )
                }
            }
            HorizontalDivider(Modifier.padding(vertical = 8.dp, horizontal = 8.dp), color = MaterialTheme.colorScheme.outlineVariant)
            Text("Appearance", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 12.dp, bottom = 6.dp))
            SegmentedPills(
                ThemeMode.entries.map { it to it.label }, themeMode, onThemeMode,
                modifier = Modifier.padding(horizontal = 4.dp),
                tint = { Accents.getValue(when (it) { ThemeMode.Light -> "amber"; ThemeMode.Dark -> "violet"; ThemeMode.System -> "blue" }) },
            )
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
