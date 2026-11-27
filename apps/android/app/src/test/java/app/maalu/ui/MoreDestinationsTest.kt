package app.maalu.ui

import app.maalu.ui.screens.MoreDestinations
import app.maalu.ui.screens.NavGroup
import app.maalu.ui.screens.destinationById
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

    @Test fun moreRepeatsNoTabAndHasNoDeadEnd() {
        listOf("dashboard", "transactions", "accounts", "budget", "import").forEach { assertNull(destinationById(it)) }
        // reached from a button, so More knows them without listing them
        assertEquals(NavGroup.App, destinationById("settings")?.group)
        assertNotNull(destinationById("notifications"))
    }
}
