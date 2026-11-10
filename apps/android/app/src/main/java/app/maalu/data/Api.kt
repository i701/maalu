package app.maalu.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.serializer
import okhttp3.FormBody
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

val AppJson = Json { ignoreUnknownKeys = true; explicitNulls = false }

/** What a call came to. Errors carry text for a person (the API's `detail`). */
sealed interface ApiResult<out T> {
    data class Ok<T>(val data: T, val total: Int? = null) : ApiResult<T>
    data class Failed(val status: Int, val message: String, val fields: Map<String, String> = emptyMap()) : ApiResult<Nothing>
}

private val http = OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .readTimeout(20, TimeUnit.SECONDS)
    .build()

class Raw(val code: Int, val body: String, val total: Int?)

/**
 * One server, one session. `token` is read on every call; a 401 on a signed-in call means the
 * session ended, so `onSignedOut` runs. (A wrong password on `/auth/login` is also 401 and is not
 * a sign-out: that call is made with no token.)
 */
class Api(
    private val server: String,
    private val token: () -> String?,
    private val onSignedOut: () -> Unit = {},
) {
    suspend fun raw(method: String, path: String, query: Map<String, Any> = emptyMap(), body: RequestBody? = null): Raw =
        withContext(Dispatchers.IO) {
            val url = "$server/api/v1/$path".toHttpUrl().newBuilder().apply { query.forEach { (k, v) -> if (v is List<*>) v.forEach { addQueryParameter(k, it.toString()) } else addQueryParameter(k, v.toString()) } }.build()
            val builder = Request.Builder().url(url).header("User-Agent", "Maalu-Android/0.1").method(method, body)
            token()?.let { builder.header("Authorization", "Bearer $it") }
            http.newCall(builder.build()).execute().use { r ->
                Raw(r.code, r.body?.string().orEmpty(), r.header("X-Total-Count")?.toIntOrNull())
            }
        }

    suspend inline fun <reified T> get(path: String, query: Map<String, Any> = emptyMap()): ApiResult<T> =
        decode(safely { raw("GET", path, query) })

    suspend inline fun <reified T> postJson(path: String, json: String): ApiResult<T> =
        decode(safely { raw("POST", path, body = json.toRequestBody("application/json".toMediaType())) })

    suspend inline fun <reified T> patchJson(path: String, json: String): ApiResult<T> =
        decode(safely { raw("PATCH", path, body = json.toRequestBody("application/json".toMediaType())) })

    suspend fun delete(path: String): ApiResult<Unit> {
        val r = safely { raw("DELETE", path) }
        return if (r is Outcome.Got && r.raw.code in 200..299) ApiResult.Ok(Unit) else failure(r)
    }

    suspend inline fun <reified T> postForm(path: String, fields: Map<String, String>): ApiResult<T> =
        decode(safely { raw("POST", path, body = FormBody.Builder().apply { fields.forEach { (k, v) -> add(k, v) } }.build()) })

    suspend fun post(path: String): ApiResult<Unit> {
        val r = safely { raw("POST", path, body = ByteArray(0).toRequestBody()) }
        return if (r is Outcome.Got && r.raw.code in 200..299) ApiResult.Ok(Unit) else failure(r)
    }

    sealed interface Outcome {
        data class Got(val raw: Raw) : Outcome
        data class Down(val message: String) : Outcome
    }

    suspend fun safely(call: suspend () -> Raw): Outcome =
        try {
            Outcome.Got(call())
        } catch (e: Exception) {
            Outcome.Down("Cannot reach the server. Check the connection.")
        }

    inline fun <reified T> decode(outcome: Outcome): ApiResult<T> {
        if (outcome !is Outcome.Got) return failure(outcome)
        val r = outcome.raw
        if (r.code !in 200..299) return failure(outcome)
        return try {
            ApiResult.Ok(AppJson.decodeFromString(serializer<T>(), r.body), r.total)
        } catch (e: Exception) {
            ApiResult.Failed(r.code, "The server's answer was not what the app expected.")
        }
    }

    fun failure(outcome: Outcome): ApiResult.Failed = when (outcome) {
        is Outcome.Down -> ApiResult.Failed(0, outcome.message)
        is Outcome.Got -> {
            if (outcome.raw.code == 401 && token() != null) onSignedOut()
            parseDetail(outcome.raw.body, fallbackFor(outcome.raw.code)).let { ApiResult.Failed(outcome.raw.code, it.message, it.fields) }
        }
    }

    private fun fallbackFor(code: Int): String = when (code) {
        401 -> "Wrong email or password, or the session ended."
        429 -> "Too many attempts. Try again in a few minutes."
        else -> "Something went wrong ($code)."
    }
}
