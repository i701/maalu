package app.maalu.data

import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Two-factor sign-in (authenticator-app codes). The API does the cryptography; this is what the screens need around it.

/** Digits only, spaces dropped: what a 6-digit authenticator code looks like once typed with a space in the middle. */
fun digitsOnly(input: String): String = input.filter { it.isDigit() }

/** Whether typed text is an authenticator code (six digits, spaces allowed) rather than a recovery code. */
fun isAuthenticatorCode(input: String): Boolean {
    val t = input.replace(" ", "")
    return t.length == 6 && t.all { it.isDigit() }
}

/** Ten letters and digits, with or without the dash and spaces: `k7m2p-9xqrt`. */
fun isRecoveryCode(input: String): Boolean {
    val t = input.replace("-", "").replace(" ", "")
    return t.length == 10 && t.all { it.isLetterOrDigit() }
}

/** The text to send for a code, or null when it is neither kind (the app checks first so a typo does not count as an attempt). */
fun codeToSend(input: String, allowRecovery: Boolean): String? = when {
    isAuthenticatorCode(input) -> input.replace(" ", "")
    allowRecovery && isRecoveryCode(input) -> input.trim()
    else -> null
}

/** "Enter the 6-digit code from your authenticator app." or, with recovery allowed, a recovery code as well. */
fun codeProblem(input: String, allowRecovery: Boolean): String? = when {
    input.isBlank() -> "Enter the code."
    codeToSend(input, allowRecovery) != null -> null
    allowRecovery -> "That is not a 6-digit code or a recovery code like k7m2p-9xqrt."
    else -> "The code is 6 digits."
}

/** A secret key in groups of four so it can be read and typed: `ABCD EFGH IJKL`. */
fun groupSecret(secret: String): String = secret.replace(" ", "").chunked(4).joinToString(" ")

/** Whether the server's setup link is one an authenticator app can open. */
fun isOtpauthUri(uri: String): Boolean = uri.startsWith("otpauth://totp/")

/** The body for `POST /auth/2fa/enable`. */
fun enableJson(code: String): JsonObject = buildJsonObject { put("code", code) }

/** The body for `POST /auth/2fa/disable` and `/auth/2fa/recovery-codes`: the password and a code. */
fun confirmJson(password: String, code: String): JsonObject = buildJsonObject { put("password", password); put("code", code) }

/** The recovery codes as lines of text, for copying. */
fun recoveryText(codes: List<String>): String = codes.joinToString("\n")

/**
 * The squares of a QR code for [text], dark ones true, with no quiet zone (the screen adds its own). The same maths the
 * server uses for its image, done here so the code can be drawn natively.
 */
fun qrMatrix(text: String): List<List<Boolean>> {
    val hints = mapOf(EncodeHintType.MARGIN to 0, EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M)
    val m = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, 0, 0, hints)
    return List(m.height) { y -> List(m.width) { x -> m.get(x, y) } }
}

/** What a one-time-code box keeps from whatever was typed or pasted: its digits, up to [length]. */
fun otpDigits(raw: String, length: Int = 6): String = digitsOnly(raw).take(length)
