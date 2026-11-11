@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Article
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Checklist
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.EventRepeat
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material.icons.outlined.ShowChart
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.TaskAlt
import androidx.compose.material.icons.outlined.UploadFile
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.maalu.data.ThemeMode
import app.maalu.ui.components.MorphTile
import app.maalu.ui.components.SegmentedPills
import app.maalu.ui.theme.Accents

/** The web's navigation groups, in order: where every destination sits in the sidebar and in More. */
enum class NavGroup(val label: String) { Money("Money"), Planning("Planning"), Organise("Organise"), Help("Help"), App("This app") }

/** One place in the app that is not in the bottom bar. Icons and colours follow the web's `NAV_ITEMS`. */
data class Destination(
    val id: String,
    val label: String,
    val icon: ImageVector,
    val accent: String,
    val group: NavGroup,
    /** What it is for, shown on the page that stands in until the real screen exists. */
    val blurb: String,
    /** The bottom bar tab this opens, or null for a screen reached only from the drawer. */
    val tabIndex: Int? = null,
)

val MoreDestinations: List<Destination> = listOf(
    Destination("dashboard", "Dashboard", Icons.Outlined.GridView, "lime", NavGroup.Money, "Your month at a glance.", tabIndex = 0),
    Destination("transactions", "Transactions", Icons.Outlined.ReceiptLong, "blue", NavGroup.Money, "Everything you spent and received.", tabIndex = 1),
    Destination("accounts", "Accounts", Icons.Outlined.AccountBalance, "green", NavGroup.Money, "Where your money is.", tabIndex = 2),
    Destination("subscriptions", "Subscriptions", Icons.Outlined.EventRepeat, "violet", NavGroup.Money, "Recurring bills, with the next payment planned for you and suggestions found in your history."),
    Destination("net-worth", "Net worth", Icons.Outlined.ShowChart, "green", NavGroup.Money, "How your net worth moved over a period and what moved it: income, spending, adjustments, transfers and exchange rates."),
    Destination("compare", "Compare", Icons.Outlined.Insights, "violet", NavGroup.Money, "Put one period against another: income, spending, what you kept and every category's move."),
    Destination("trends", "Trends", Icons.Outlined.CalendarMonth, "lime", NavGroup.Money, "Every category by month, as a table or stacked columns."),
    Destination("import", "Import", Icons.Outlined.UploadFile, "orange", NavGroup.Money, "Bring in a bank's CSV statement, review the rows and import them safely."),
    Destination("places", "Places", Icons.Outlined.LocationOn, "pink", NavGroup.Money, "A map of where your spending went."),
    Destination("budget", "Budget", Icons.Outlined.Savings, "amber", NavGroup.Planning, "Limits and savings goals.", tabIndex = 3),
    Destination("plan", "Month plan", Icons.Outlined.Checklist, "amber", NavGroup.Planning, "Your bills by day, what is left after each, and where the money runs out."),
    Destination("pending", "Pending", Icons.Outlined.TaskAlt, "orange", NavGroup.Planning, "Salary splits waiting for your approval."),
    Destination("vendors", "Vendors", Icons.Outlined.Storefront, "orange", NavGroup.Organise, "The places and people you pay, with their usual category and tags."),
    Destination("categories", "Categories", Icons.Outlined.Category, "pink", NavGroup.Organise, "Your categories, their colours, parents and whether they are needs or wants."),
    Destination("tags", "Tags", Icons.Outlined.Sell, "violet", NavGroup.Organise, "Labels that cut across categories."),
    Destination("groups", "Groups", Icons.Outlined.Inventory2, "blue", NavGroup.Organise, "Bundle related transactions, like a trip, and see what they add up to."),
    Destination("templates", "Templates", Icons.Outlined.Bookmark, "lime", NavGroup.Organise, "Saved starting points for transactions you repeat."),
    Destination("trash", "Trash", Icons.Outlined.Delete, "slate", NavGroup.Organise, "Deleted transactions, until you restore them or delete them for good."),
    Destination("settings", "Settings", Icons.Outlined.Settings, "slate", NavGroup.App, "Security: two-factor sign-in, and more to come."),
    Destination("docs", "Docs", Icons.Outlined.Article, "blue", NavGroup.Help, "Guides to what each feature is and how to use it."),
)

fun destinationById(id: String?): Destination? = MoreDestinations.firstOrNull { it.id == id }

/** Stands in for a screen that is not built in the app yet: what it is for, and that the web has it. */
@Composable
fun ComingSoon(d: Destination) {
    val tint = Accents.getValue(d.accent)
    Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(72.dp).clip(RoundedCornerShape(24.dp)).background(tint.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
            Icon(d.icon, null, tint = tint, modifier = Modifier.size(36.dp))
        }
        Text(d.label, style = MaterialTheme.typography.titleLarge)
        Text(d.blurb, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        Text("This screen is not in the app yet. It is in the web app.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
    }
}
