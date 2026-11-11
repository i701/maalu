package app.maalu.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Notifications: things in your data worth a look, made by the server. This is what the bell and its page need.

/** Named so it does not clash with the platform's own `Notification`. */
@Serializable
data class AppNotification(
    val id: String,
    val kind: String,
    val title: String,
    val body: String = "",
    val link: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("read_at") val readAt: String? = null,
) {
    val unread: Boolean get() = readAt == null
}

@Serializable
data class UnreadCount(val count: Int = 0)

/** How a kind is labelled and which accent it takes (the web's `KIND_META`); "error" means the theme's error colour. */
data class KindMeta(val label: String, val accent: String)

val KindMetas: Map<String, KindMeta> = mapOf(
    "payment_due" to KindMeta("Payment due", "blue"),
    "payment_overdue" to KindMeta("Overdue", "error"),
    "installments_done" to KindMeta("Plan finished", "green"),
    "budget_warning" to KindMeta("Budget", "amber"),
    "budget_over" to KindMeta("Over budget", "error"),
    "goal_reached" to KindMeta("Goal", "green"),
    "split_waiting" to KindMeta("Split waiting", "blue"),
    "money_short" to KindMeta("Running short", "error"),
    "card_due" to KindMeta("Card payment", "blue"),
    "card_overdue" to KindMeta("Card overdue", "error"),
    "card_limit" to KindMeta("Card limit", "amber"),
    "subscription_candidate" to KindMeta("Looks like a subscription", "green"),
)

fun kindMeta(kind: String): KindMeta = KindMetas[kind] ?: KindMeta("Notice", "slate")

/** "9+" past nine, so the badge stays small. */
fun badgeText(count: Int): String = if (count > 9) "9+" else count.toString()

/** Where a notification's `link` (a page of the web app) leads in this app. */
sealed interface Target {
    data class Route(val id: String) : Target
    data class Tab(val index: Int) : Target
    data class Account(val id: String) : Target
}

const val TAB_TRANSACTIONS = 1
const val TAB_BUDGET = 3

/** The screen for a web path such as `/plan` or `/accounts/<id>`, or null when the app has no such screen (the notification then only gets marked read). */
fun targetFor(link: String?): Target? {
    val path = link?.trim()?.substringBefore("?")?.trimEnd('/') ?: return null
    return when {
        path == "/transactions" -> Target.Tab(TAB_TRANSACTIONS)
        path == "/budget" -> Target.Tab(TAB_BUDGET)
        path == "/plan" -> Target.Route("plan")
        path == "/pending" -> Target.Route("pending")
        path == "/subscriptions" -> Target.Route("subscriptions")
        path.startsWith("/accounts/") && path.length > "/accounts/".length -> Target.Account(path.removePrefix("/accounts/"))
        else -> null
    }
}

/** The list after one was read, without asking again. */
fun markRead(list: List<AppNotification>, id: String, at: String): List<AppNotification> =
    list.map { if (it.id == id && it.unread) it.copy(readAt = at) else it }

/** The count to show after changing [list] (the badge counts every unread one, not only the loaded ones). */
fun unreadAfterRead(count: Int, wasUnread: Boolean): Int = if (wasUnread) (count - 1).coerceAtLeast(0) else count
