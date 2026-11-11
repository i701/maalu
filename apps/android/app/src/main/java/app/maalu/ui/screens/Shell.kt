@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.runtime.mutableStateOf
import app.maalu.data.monthLabel
import java.time.LocalDate
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ThemeMode
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow

/** Lets any screen show a message at the bottom (above the bar). */
val LocalSnackbar = androidx.compose.runtime.staticCompositionLocalOf<androidx.compose.material3.SnackbarHostState?> { null }

private data class Tab(val label: String, val icon: ImageVector)

// The bottom bar keeps the four places used all the time; every destination (these four included) is in the drawer.
private val Tabs = listOf(
    Tab("Dashboard", Icons.Outlined.GridView),
    Tab("Transactions", Icons.Outlined.ReceiptLong),
    Tab("Accounts", Icons.Outlined.AccountBalance),
    Tab("Budget", Icons.Outlined.Savings),
)

private const val DASHBOARD = 0
private const val TRANSACTIONS = 1
private const val ACCOUNTS = 2
private const val BUDGET = 3

/**
 * The signed-in frame: a sidebar drawer with every destination (a menu button opens it, or swipe from the left edge),
 * a top app bar that holds the screen's name and collapses as the content scrolls, and the bottom bar with the four
 * everyday places. Dashboard, Transactions, Accounts, Budget, Categories, Tags, Vendors, Subscriptions and Settings are real; the other destinations are placeholders.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun Shell(api: Api, server: String, themeMode: ThemeMode, onThemeMode: (ThemeMode) -> Unit, onSignOut: () -> Unit) {
    var selected by rememberSaveable { mutableIntStateOf(0) }
    // a destination reached only from the drawer, or null while one of the four tabs is showing
    var route by rememberSaveable { mutableStateOf<String?>(null) }
    val destination = destinationById(route)
    // an account's own page (its id and name), opened from the Accounts tab
    var openAccountId by rememberSaveable { mutableStateOf<String?>(null) }
    var openAccountName by rememberSaveable { mutableStateOf("") }
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    // back from a drawer destination returns to the tab you were on
    androidx.activity.compose.BackHandler(enabled = destination != null) { route = null }
    androidx.activity.compose.BackHandler(enabled = destination == null && openAccountId != null) { openAccountId = null }
    // the month lives here so the app bar can move it for the Dashboard and the Budget
    var month by rememberSaveable { mutableStateOf(LocalDate.now().withDayOfMonth(1).toString()) }
    val scroll = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()
    val snackbar = remember { androidx.compose.material3.SnackbarHostState() }
    val onTab = destination == null
    val onAccountPage = onTab && selected == ACCOUNTS && openAccountId != null
    val monthly = onTab && !onAccountPage && (selected == DASHBOARD || selected == BUDGET)
    // the drawer's highlighted item: the open destination, else the tab
    val selectedId = destination?.id ?: MoreDestinations.firstOrNull { it.tabIndex == selected }?.id

    ModalNavigationDrawer(
        drawerState = drawer,
        drawerContent = {
            AppDrawer(
                server = server, selectedId = selectedId, themeMode = themeMode, onThemeMode = onThemeMode,
                onOpen = { d ->
                    if (d.tabIndex != null) { selected = d.tabIndex; route = null } else route = d.id
                    scope.launch { drawer.close() }
                },
                onSignOut = { scope.launch { drawer.close() }; onSignOut() },
            )
        },
    ) {
        androidx.compose.runtime.CompositionLocalProvider(LocalSnackbar provides snackbar) { Scaffold(
            snackbarHost = { androidx.compose.material3.SnackbarHost(snackbar) },
            modifier = Modifier.nestedScroll(scroll.nestedScrollConnection),
            topBar = {
                MediumFlexibleTopAppBar(
                    title = { Text(destination?.label ?: if (onAccountPage) openAccountName else Tabs[selected].label) },
                    navigationIcon = {
                        // on an account's page the button goes back to the list; elsewhere it opens the drawer
                        if (onAccountPage) IconButton(onClick = { openAccountId = null }) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back to accounts") }
                        else IconButton(onClick = { scope.launch { drawer.open() } }) { Icon(Icons.Outlined.Menu, "Open the menu") }
                    },
                    subtitle = if (monthly) ({ Text(monthLabel(LocalDate.parse(month))) }) else null,
                    actions = {
                        if (monthly) {
                            IconButton(onClick = { month = LocalDate.parse(month).minusMonths(1).toString() }) {
                                Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, "Previous month")
                            }
                            IconButton(onClick = { month = LocalDate.parse(month).plusMonths(1).toString() }) {
                                Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, "Next month")
                            }
                        }
                    },
                    scrollBehavior = scroll,
                )
            },
            bottomBar = {
                NavigationBar {
                    Tabs.forEachIndexed { i, tab ->
                        NavigationBarItem(
                            // nothing is highlighted while a drawer-only destination is open
                            selected = onTab && selected == i,
                            // choosing the Accounts tab again from an account's page goes back to the list
                            onClick = { if (i == ACCOUNTS) openAccountId = null; selected = i; route = null },
                            icon = { Icon(tab.icon, contentDescription = null) },
                            // one line: "Transactions" wrapped at 360dp wide at the default size
                            label = { Text(tab.label, style = MaterialTheme.typography.labelSmall, maxLines = 1, softWrap = false) },
                        )
                    }
                }
            },
        ) { padding ->
            Box(Modifier.fillMaxSize().padding(padding)) {
                if (destination != null) when (destination.id) {
                    "categories" -> CategoriesScreen(api)
                    "tags" -> TagsScreen(api)
                    "vendors" -> VendorsScreen(api)
                    "subscriptions" -> SubscriptionsScreen(api)
                    "settings" -> SettingsScreen(api)
                    else -> ComingSoon(destination)
                }
                else when (selected) {
                    DASHBOARD -> DashboardScreen(api, month)
                    TRANSACTIONS -> TransactionsScreen(api)
                    ACCOUNTS -> {
                        val id = openAccountId
                        if (id == null) AccountsScreen(api, onOpen = { openAccountId = it.id; openAccountName = it.name })
                        else AccountDetailScreen(api, id, onBack = { openAccountId = null })
                    }
                    BUDGET -> BudgetScreen(api, month)
                }
            }
        }
        }
    }
}
