package app.maalu.data

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.Instant
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneOffset

// What the Settings screen needs around the API: passwords, devices and the small switches.

/** "Firefox on Linux", worked out from a User-Agent the way the web's Settings does. */
fun describeDevice(userAgent: String?): String {
    val ua = userAgent?.takeIf { it.isNotBlank() } ?: return "Unknown device"
    if (ua.startsWith("Maalu-Android")) return "Maalu app on Android"
    val browser = when {
        Regex("""\bEdg(e|A|iOS)?/""").containsMatchIn(ua) -> "Edge"
        Regex("""\b(OPR|Opera)/""").containsMatchIn(ua) -> "Opera"
        Regex("""\b(Firefox|FxiOS)/""").containsMatchIn(ua) -> "Firefox"
        Regex("""\b(Chrome|CriOS)/""").containsMatchIn(ua) -> "Chrome"
        "Safari/" in ua && "Version/" in ua -> "Safari"
        ua.startsWith("curl/", ignoreCase = true) -> "curl"
        else -> null
    }
    val system = when {
        "Android" in ua -> "Android"
        Regex("iPhone|iPad|iPod").containsMatchIn(ua) -> "iOS"
        "Windows" in ua -> "Windows"
        Regex("Mac OS X|Macintosh").containsMatchIn(ua) -> "macOS"
        "CrOS" in ua -> "ChromeOS"
        Regex("Linux|X11").containsMatchIn(ua) -> "Linux"
        else -> null
    }
    return if (browser != null && system != null) "$browser on $system" else browser ?: system ?: "Unknown device"
}

/** "5 minutes ago", "just now", "3 days ago". An unreadable time is shown as it came. */
fun formatAgo(iso: String, now: Instant = Instant.now()): String {
    val then = parseInstant(iso) ?: return iso
    val seconds = now.epochSecond - then.epochSecond
    if (seconds < 60) return "just now"
    fun unit(n: Long, name: String) = "$n $name${if (n == 1L) "" else "s"} ago"
    return when {
        seconds < 3600 -> unit(seconds / 60, "minute")
        seconds < 86_400 -> unit(seconds / 3600, "hour")
        seconds < 86_400 * 30 -> unit(seconds / 86_400, "day")
        else -> unit(seconds / (86_400 * 30), "month")
    }
}

/** The API sends UTC times, sometimes without a zone mark: both are read as UTC. */
fun parseInstant(iso: String): Instant? =
    runCatching { OffsetDateTime.parse(iso).toInstant() }.getOrNull()
        ?: runCatching { LocalDateTime.parse(iso).toInstant(ZoneOffset.UTC) }.getOrNull()

/** What is wrong with a password change before it is sent (the server checks again), or null. */
fun passwordProblem(current: String, new: String, again: String): String? = when {
    current.isEmpty() -> "Enter your current password."
    new.length < 8 -> "The new password needs at least 8 characters."
    new.length > 128 -> "The new password is too long (128 characters at most)."
    new == current -> "The new password must be different from the current one."
    new != again -> "The two new passwords do not match."
    else -> null
}

/** The body for `POST /auth/password`; [code] only when two-factor is on. */
fun passwordJson(current: String, new: String, code: String?): JsonObject = buildJsonObject {
    put("current_password", current); put("new_password", new)
    if (code != null) put("code", code)
}

/** A `PATCH /users/me` that changes one switch. */
fun switchJson(field: String, on: Boolean): JsonObject = buildJsonObject { put(field, on) }

/** A `PATCH /users/me` that sets the default account, or clears it (an explicit null). */
fun defaultAccountJson(id: String?): JsonObject = buildJsonObject { put("default_account_id", if (id == null) JsonNull else JsonPrimitive(id)) }
