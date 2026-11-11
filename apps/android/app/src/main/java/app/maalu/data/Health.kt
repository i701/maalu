package app.maalu.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

private val client = OkHttpClient.Builder()
    .connectTimeout(8, TimeUnit.SECONDS)
    .readTimeout(8, TimeUnit.SECONDS)
    .build()

/**
 * Whether an answer to `GET /api/v1/whoami` with no credential came from a Maalu server: its JSON, and a 401 (nobody signed
 * in) or 200 (an API key) or 403. Anything else, such as a page from some other site, is not.
 */
fun looksLikeMaalu(code: Int, body: String): Boolean {
    if (code != 200 && code != 401 && code != 403) return false
    val json = try { AppJson.parseToJsonElement(body) } catch (e: Exception) { return false }
    return json is JsonObject && (json.containsKey("detail") || json.containsKey("kind"))
}

private fun get(url: String): Pair<Int, String> {
    val request = Request.Builder().url(url).header("User-Agent", "Maalu-Android/0.1").build()
    return client.newCall(request).execute().use { it.code to it.body?.string().orEmpty() }
}

/**
 * Is there a Maalu server at this address? Asks `GET {server}/health`, which the API itself answers (a development
 * server). Behind the web address that path does not exist, so it then asks `GET {server}/api/v1/whoami` with no sign-in:
 * the web server's door to the API answers a JSON 401, which is proof enough. Returns null when one answers, else a
 * message for the person.
 */
suspend fun checkServer(server: String): String? = withContext(Dispatchers.IO) {
    try {
        val (code, _) = get("$server/health")
        if (code in 200..299) return@withContext null
        val (second, body) = get("$server/api/v1/whoami")
        if (looksLikeMaalu(second, body)) null else "That address answered, but it does not look like a Maalu server (${second})."
    } catch (e: IllegalArgumentException) {
        "That does not look like an address."
    } catch (e: Exception) {
        "Cannot reach the server. Check the address and your connection."
    }
}
