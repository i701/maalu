package app.maalu.data

import java.time.Instant
import org.junit.Test
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull

class SettingsLogicTest {
    @Test fun devicesAreNamedLikeTheWeb() {
        assertEquals("Firefox on Linux", describeDevice("Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0"))
        assertEquals("Chrome on Android", describeDevice("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"))
        assertEquals("Maalu app on Android", describeDevice("Maalu-Android/0.1"))
        assertEquals("curl", describeDevice("curl/8.5.0"))
        assertEquals("Unknown device", describeDevice(null))
    }

    @Test fun agoReadsInPlainWords() {
        val now = Instant.parse("2026-11-11T12:00:00Z")
        assertEquals("just now", formatAgo("2026-11-11T11:59:30Z", now))
        assertEquals("1 minute ago", formatAgo("2026-11-11T11:59:00Z", now))
        assertEquals("5 minutes ago", formatAgo("2026-11-11T11:55:00", now)) // no zone mark: UTC
        assertEquals("3 hours ago", formatAgo("2026-11-11T09:00:00+00:00", now))
        assertEquals("2 days ago", formatAgo("2026-11-09T12:00:00Z", now))
        assertEquals("not a time", formatAgo("not a time", now))
    }

    @Test fun passwordChecks() {
        assertNull(passwordProblem("old-password", "new-password", "new-password"))
        assertEquals("Enter your current password.", passwordProblem("", "new-password", "new-password"))
        assertEquals("The new password needs at least 8 characters.", passwordProblem("old", "short", "short"))
        assertEquals("The new password must be different from the current one.", passwordProblem("same-password", "same-password", "same-password"))
        assertEquals("The two new passwords do not match.", passwordProblem("old-password", "new-password", "new-passwordx"))
    }

    @Test fun bodies() {
        assertEquals("""{"current_password":"a","new_password":"b"}""", passwordJson("a", "b", null).toString())
        assertEquals("""{"current_password":"a","new_password":"b","code":"123456"}""", passwordJson("a", "b", "123456").toString())
        assertEquals("""{"notify_budget":false}""", switchJson("notify_budget", false).toString())
        assertEquals("""{"default_account_id":null}""", defaultAccountJson(null).toString())
        assertEquals("""{"default_account_id":"x"}""", defaultAccountJson("x").toString())
    }

    @Test fun shortNumbersStartAtAThousandOnlyWhenOn() {
        try {
            NumberPrefs.short = false
            assertEquals("MVR 1,234.50", formatMoney("1234.5", "MVR"))
            NumberPrefs.short = true
            assertEquals("MVR 1.23K", formatMoney("1234.5", "MVR"))
            assertEquals("MVR 999.00", formatMoney("999", "MVR"))
            assertEquals("MVR 1,234.50", formatMoneyFull("1234.5", "MVR"))
        } finally { NumberPrefs.short = false }
    }
}
