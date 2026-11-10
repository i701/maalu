package app.maalu.ui

import app.maalu.ui.screens.MoreDestinations
import app.maalu.ui.screens.NavGroup
import app.maalu.ui.screens.destinationById
import app.maalu.ui.theme.Accents
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MoreDestinationsTest {
    @Test fun everyDestinationHasItsOwnId() {
        assertEquals(MoreDestinations.size, MoreDestinations.map { it.id }.toSet().size)
    }

    @Test fun everyGroupHasSomething() {
        NavGroup.entries.forEach { g -> assertTrue("${g.label} is empty", MoreDestinations.any { it.group == g }) }
    }

    @Test fun accentsAreRealColours() {
        MoreDestinations.forEach { assertTrue("${it.id}: ${it.accent}", it.accent in Accents.keys) }
    }

    @Test fun theFourTabsAreInTheDrawerWithTheirIndex() {
        assertEquals(listOf(0, 1, 2, 3), MoreDestinations.mapNotNull { it.tabIndex }.sorted())
        assertEquals(0, destinationById("dashboard")?.tabIndex)
        assertEquals(3, destinationById("budget")?.tabIndex)
        assertNull(destinationById("subscriptions")?.tabIndex)
        assertNotNull(destinationById("subscriptions"))
    }
}
