package app.maalu.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HealthTest {
    @Test fun aJsonUnauthorizedFromTheApiDoorIsAMaaluServer() {
        assertTrue(looksLikeMaalu(401, """{"detail":"Sign in, or send an API key as: Authorization: Bearer mlk_..."}"""))
        assertTrue(looksLikeMaalu(401, """{"detail":"Not authenticated"}"""))
    }

    @Test fun anApiKeyAnswerCountsToo() {
        assertTrue(looksLikeMaalu(200, """{"kind":"api_key","key_name":"x","role":"viewer","scopes":[],"expires_at":null}"""))
        assertTrue(looksLikeMaalu(403, """{"detail":"This API key does not have the permission x"}"""))
    }

    @Test fun otherSitesAndOtherCodesDoNot() {
        assertFalse(looksLikeMaalu(404, """{"detail":"Not found"}"""))
        assertFalse(looksLikeMaalu(401, "<html>Please sign in</html>"))
        assertFalse(looksLikeMaalu(401, """["not","an","object"]"""))
        assertFalse(looksLikeMaalu(401, """{"error":"nope"}"""))
        assertFalse(looksLikeMaalu(500, """{"detail":"boom"}"""))
        assertFalse(looksLikeMaalu(200, ""))
    }
}
