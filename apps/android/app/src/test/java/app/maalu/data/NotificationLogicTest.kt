package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationLogicTest {
    @Test fun linksLeadToTheScreensTheAppHas() {
        assertEquals(Target.Route("plan"), targetFor("/plan"))
        assertEquals(Target.Route("pending"), targetFor("/pending"))
        assertEquals(Target.Route("subscriptions"), targetFor("/subscriptions/"))
        assertEquals(Target.Tab(TAB_BUDGET), targetFor("/budget"))
        assertEquals(Target.Tab(TAB_TRANSACTIONS), targetFor("/transactions?planned=true"))
        assertEquals(Target.Account("abc-123"), targetFor("/accounts/abc-123"))
        assertNull(targetFor("/goals"))
        assertNull(targetFor("/accounts/"))
        assertNull(targetFor(null))
    }

    @Test fun everyKindTheServerMakesHasALabel() {
        val kinds = listOf("payment_due", "payment_overdue", "installments_done", "budget_warning", "budget_over", "goal_reached", "split_waiting", "money_short", "card_due", "card_overdue", "card_limit", "subscription_candidate")
        kinds.forEach { assertTrue(it, it in KindMetas) }
        assertEquals("Notice", kindMeta("something_new").label)
    }

    @Test fun badgeStaysSmall() {
        assertEquals("3", badgeText(3))
        assertEquals("9", badgeText(9))
        assertEquals("9+", badgeText(10))
    }

    @Test fun readingOneUpdatesTheListAndTheCount() {
        val a = AppNotification("a", "goal_reached", "Goal", createdAt = "2026-11-11T10:00:00Z")
        val b = a.copy(id = "b", readAt = "2026-11-11T11:00:00Z")
        val after = markRead(listOf(a, b), "a", "2026-11-11T12:00:00Z")
        assertEquals("2026-11-11T12:00:00Z", after[0].readAt)
        assertEquals("2026-11-11T11:00:00Z", after[1].readAt) // an already read one keeps its time
        assertEquals(4, unreadAfterRead(5, wasUnread = true))
        assertEquals(5, unreadAfterRead(5, wasUnread = false))
        assertEquals(0, unreadAfterRead(0, wasUnread = true))
    }
}
