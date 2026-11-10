package app.maalu.data

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Categories, tags and vendors: their forms and rules (ported from the web's lib/categories.ts and the API's rules).

val AccentNames = listOf("violet", "orange", "amber", "blue", "green", "lime", "pink", "slate")

/** "Need", "Want" or null for not sorted. */
fun kindLabel(kind: String?): String? = when (kind) { "need" -> "Need"; "want" -> "Want"; else -> null }

/** `"a"`, `"b"`... as the same names without case or stray spaces: how the API compares names. */
fun sameName(a: String, b: String): Boolean = a.trim().replace(Regex("\\s+"), " ").equals(b.trim().replace(Regex("\\s+"), " "), ignoreCase = true)

// ---- categories ----

data class CategoryForm(
    val name: String = "",
    /** null on a new category means "automatic": the API picks the colour used least. */
    val color: String? = null,
    val parentId: String? = null,
    val kind: String? = null,
)

enum class OrganiseField { Name }
data class OrganiseProblem(val field: OrganiseField, val message: String)

fun CategoryForm.problem(existing: List<Category>, editingId: String?): OrganiseProblem? {
    if (name.isBlank()) return OrganiseProblem(OrganiseField.Name, "Give the category a name.")
    if (existing.any { it.id != editingId && sameName(it.name, name) }) return OrganiseProblem(OrganiseField.Name, "You already have a category called ${name.trim()}.")
    return null
}

fun CategoryForm.toJson(): JsonObject = buildJsonObject {
    put("name", name.trim())
    color?.let { put("color", it) }
    parentId?.let { put("parent_id", it) }
    kind?.let { put("kind", it) }
}

fun categoryFormFrom(c: Category): CategoryForm = CategoryForm(c.name, c.color, c.parentId, c.kind)

/** Only what changed; removing a parent or a kind is an explicit null. */
fun CategoryForm.patchJson(before: CategoryForm): JsonObject = buildJsonObject {
    if (name.trim() != before.name.trim()) put("name", name.trim())
    if (color != before.color && color != null) put("color", color)
    if (parentId != before.parentId) { if (parentId == null) put("parent_id", JsonNull) else put("parent_id", parentId) }
    if (kind != before.kind) { if (kind == null) put("kind", JsonNull) else put("kind", kind) }
}

/**
 * The categories a category may sit under: top-level ones other than itself. A category that has sub-categories
 * of its own cannot get a parent (one level only), and the default Salary category takes none.
 */
fun parentChoices(all: List<Category>, editing: Category?): List<Category> {
    if (editing != null && (editing.childCount > 0 || editing.isSalary)) return emptyList()
    return all.filter { it.parentId == null && it.id != editing?.id }
}

/** What a category can be merged into: any other category. The default Salary one is never merged away. */
fun mergeTargets(all: List<Category>, from: Category): List<Category> = all.filter { it.id != from.id }

// ---- tags ----

fun tagProblem(name: String, existing: List<Tag>, editingId: String?): OrganiseProblem? {
    if (name.isBlank()) return OrganiseProblem(OrganiseField.Name, "Give the tag a name.")
    if (existing.any { it.id != editingId && sameName(it.name, name) }) return OrganiseProblem(OrganiseField.Name, "You already have a tag called ${name.trim()}.")
    return null
}

fun tagJson(name: String): JsonObject = buildJsonObject { put("name", name.trim()) }

// ---- vendors ----

data class VendorForm(
    val name: String = "",
    val address: String = "",
    val contact: String = "",
    val currency: String = "",
    /** null: not yet classified. */
    val isLocal: Boolean? = null,
    val defaultCategory: String = "",
    val defaultTags: List<String> = emptyList(),
)

fun VendorForm.problem(): OrganiseProblem? =
    if (name.isBlank()) OrganiseProblem(OrganiseField.Name, "Give the vendor a name.") else null

fun VendorForm.toJson(): JsonObject = buildJsonObject {
    put("name", name.trim())
    address.trim().takeIf { it.isNotEmpty() }?.let { put("address", it) }
    contact.trim().takeIf { it.isNotEmpty() }?.let { put("contact", it) }
    currency.takeIf { it.isNotBlank() }?.let { put("currency", it) }
    isLocal?.let { put("is_local", it) }
    defaultCategory.trim().takeIf { it.isNotEmpty() }?.let { put("default_category", it) }
    if (defaultTags.isNotEmpty()) put("default_tags", JsonArray(defaultTags.map { JsonPrimitive(it) }))
}

fun vendorFormFrom(v: Vendor): VendorForm = VendorForm(
    v.name, v.address.orEmpty(), v.contact.orEmpty(), v.currency.orEmpty(), v.isLocal, v.defaultCategory.orEmpty(), v.defaultTags.map { it.name },
)

/** Only what changed; clearing a text field, the usual category or the tags is an explicit null or empty list. */
fun VendorForm.patchJson(before: VendorForm): JsonObject = buildJsonObject {
    fun text(key: String, now: String, was: String) {
        if (now.trim() != was.trim()) { if (now.isBlank()) put(key, JsonNull) else put(key, now.trim()) }
    }
    if (name.trim() != before.name.trim()) put("name", name.trim())
    text("address", address, before.address)
    text("contact", contact, before.contact)
    if (currency != before.currency) { if (currency.isBlank()) put("currency", JsonNull) else put("currency", currency) }
    if (isLocal != before.isLocal) { if (isLocal == null) put("is_local", JsonNull) else put("is_local", isLocal) }
    text("default_category", defaultCategory, before.defaultCategory)
    if (defaultTags != before.defaultTags) put("default_tags", JsonArray(defaultTags.map { JsonPrimitive(it) }))
}

/** Local, Foreign, or nothing yet. */
fun localityLabel(isLocal: Boolean?): String? = when (isLocal) { true -> "Local"; false -> "Foreign"; null -> null }

/** `{"into_id": ...}` for a merge. */
fun mergeJson(intoId: String): JsonObject = buildJsonObject { put("into_id", intoId) }
