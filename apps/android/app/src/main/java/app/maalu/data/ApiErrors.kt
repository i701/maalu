package app.maalu.data

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** An error as a person should read it, plus which fields the server blamed (by API name). */
data class ParsedError(val message: String, val fields: Map<String, String> = emptyMap())

private val FieldNames = mapOf(
    "amount" to "Amount",
    "to_amount" to "Amount received",
    "transaction_date" to "Date",
    "transaction_time" to "Time",
    "account_id" to "Account",
    "to_account_id" to "To account",
    "category" to "Category",
    "vendor_name" to "Vendor",
    "exchange_rate" to "Exchange rate",
    "currency" to "Currency",
    "payment_method" to "Payment method",
    "description" to "Note",
    "tags" to "Tags",
    "type" to "Type",
)

fun friendlyField(name: String): String = FieldNames[name] ?: name.replace('_', ' ').replaceFirstChar { it.uppercase() }

/**
 * Reads the API's `detail`: a plain string (a rule the service refused), or FastAPI's list of
 * `{loc, msg}` for validation. A message names its field when it has one ("Amount: Input should be
 * greater than 0") and loses pydantic's "Value error, " prefix. Anything else becomes [fallback].
 */
fun parseDetail(body: String, fallback: String): ParsedError {
    val detail = try {
        AppJson.parseToJsonElement(body).jsonObject["detail"]
    } catch (e: Exception) {
        null
    }
    return when (detail) {
        is JsonPrimitive -> ParsedError(detail.contentOrNull ?: fallback)
        is JsonArray -> {
            val fields = linkedMapOf<String, String>()
            val lines = detail.mapNotNull { item ->
                val obj = item as? JsonObject ?: return@mapNotNull null
                val msg = obj["msg"]?.jsonPrimitive?.contentOrNull?.removePrefix("Value error, ")?.replaceFirstChar { it.uppercase() } ?: return@mapNotNull null
                // loc is ["body", "amount"]; a rule across the whole body is just ["body"]
                val field = obj["loc"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull }?.filterNot { it == "body" }?.lastOrNull()
                if (field != null) { fields.putIfAbsent(field, msg); "${friendlyField(field)}: $msg" } else msg
            }.distinct()
            if (lines.isEmpty()) ParsedError(fallback) else ParsedError(lines.take(3).joinToString("\n"), fields)
        }
        else -> ParsedError(fallback)
    }
}
