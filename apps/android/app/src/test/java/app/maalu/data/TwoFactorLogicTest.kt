package app.maalu.data

import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TwoFactorLogicTest {
    @Test fun anAuthenticatorCodeIsSixDigitsSpacesAllowed() {
        assertTrue(isAuthenticatorCode("123456")); assertTrue(isAuthenticatorCode("123 456"))
        assertFalse(isAuthenticatorCode("12345")); assertFalse(isAuthenticatorCode("1234567")); assertFalse(isAuthenticatorCode("12a456"))
        assertEquals("123456", digitsOnly("12 34-56"))
    }

    @Test fun theCodeBoxesKeepOnlyDigitsUpToTheirLength() {
        assertEquals("123456", otpDigits("12 34-56"))
        assertEquals("123456", otpDigits("1234567890"))
        assertEquals("12", otpDigits("1a2b"))
        assertEquals("", otpDigits("abc"))
        assertEquals("1234", otpDigits("123456", length = 4))
    }

    @Test fun aRecoveryCodeIsTenLettersAndDigits() {
        assertTrue(isRecoveryCode("k7m2p-9xqrt")); assertTrue(isRecoveryCode("k7m2p 9xqrt")); assertTrue(isRecoveryCode("K7M2P9XQRT"))
        assertFalse(isRecoveryCode("k7m2p-9xqr")); assertFalse(isRecoveryCode("k7m2p-9xqr!"))
    }

    @Test fun onlyWhatIsAllowedIsSent() {
        assertEquals("123456", codeToSend("123 456", allowRecovery = false))
        assertNull(codeToSend("k7m2p-9xqrt", allowRecovery = false))
        assertEquals("k7m2p-9xqrt", codeToSend(" k7m2p-9xqrt ", allowRecovery = true))
        assertNull(codeToSend("nope", allowRecovery = true))
    }

    @Test fun theMessageNamesWhatIsExpected() {
        assertEquals("Enter the code.", codeProblem(" ", false))
        assertEquals("The code is 6 digits.", codeProblem("12", false))
        assertEquals("That is not a 6-digit code or a recovery code like k7m2p-9xqrt.", codeProblem("12", true))
        assertNull(codeProblem("123456", false))
    }

    @Test fun aKeyIsReadableInGroups() {
        assertEquals("ABCD EFGH IJKL MN", groupSecret("ABCDEFGHIJKLMN"))
        assertEquals("ABCD EFGH", groupSecret("ABCD EFGH"))
    }

    @Test fun onlyAuthenticatorLinksAreOpened() {
        assertTrue(isOtpauthUri("otpauth://totp/Maalu:me@x.y?secret=ABC&issuer=Maalu"))
        assertFalse(isOtpauthUri("https://evil.example/otpauth://totp/x")); assertFalse(isOtpauthUri("javascript:alert(1)"))
    }

    @Test fun theBodiesCarryTheFields() {
        assertEquals("123456", enableJson("123456")["code"]!!.jsonPrimitive.content)
        val c = confirmJson("pw", "k7m2p-9xqrt")
        assertEquals("pw", c["password"]!!.jsonPrimitive.content); assertEquals("k7m2p-9xqrt", c["code"]!!.jsonPrimitive.content)
        assertEquals("a-b\nc-d", recoveryText(listOf("a-b", "c-d")))
    }

    @Test fun theQrCodeIsASquareWithItsThreeFinderPatterns() {
        val m = qrMatrix("otpauth://totp/Maalu:me@x.y?secret=JBSWY3DPEHPK3PXP&issuer=Maalu")
        assertTrue(m.size >= 21); assertTrue(m.all { it.size == m.size })
        val n = m.size
        // each finder pattern is a 7x7 dark ring with a 3x3 dark centre, at three corners
        for ((ox, oy) in listOf(0 to 0, n - 7 to 0, 0 to n - 7)) {
            for (i in 0..6) { assertTrue(m[oy][ox + i]); assertTrue(m[oy + 6][ox + i]); assertTrue(m[oy + i][ox]); assertTrue(m[oy + i][ox + 6]) }
            for (i in 2..4) for (j in 2..4) assertTrue(m[oy + i][ox + j])
            assertFalse(m[oy + 1][ox + 1])
        }
    }
}
