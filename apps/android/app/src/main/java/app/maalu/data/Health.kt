package app.maalu.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

private val client = OkHttpClient.Builder()
    .connectTimeout(8, TimeUnit.SECONDS)
    .readTimeout(8, TimeUnit.SECONDS)
    .build()

/**
 * Asks `GET {server}/health`, which needs no sign-in. Returns null when it answers, else a message
 * for the person. (Behind the web address this path is only reachable if the server forwards it.)
 */
suspend fun checkServer(server: String): String? = withContext(Dispatchers.IO) {
    try {
        val request = Request.Builder().url("$server/health").header("User-Agent", "Maalu-Android/0.1").build()
        client.newCall(request).execute().use { response ->
            if (response.isSuccessful) null else "The server answered ${response.code}."
        }
    } catch (e: IllegalArgumentException) {
        "That does not look like an address."
    } catch (e: Exception) {
        "Cannot reach the server. Check the address and your connection."
    }
}
