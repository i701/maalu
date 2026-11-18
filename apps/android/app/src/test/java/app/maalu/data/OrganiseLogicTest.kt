package app.maalu.data

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OrganiseLogicTest {
    private val food = Category("c1", "Food", "green", childCount = 2)
    private val dining = Category("c2", "Dining", "pink", parentId = "c1", parent = "Food")
    private val rent = Category("c3", "Rent")
    private val salary = Category("c4", "Salary", isSalary = true)
    private val all = listOf(food, dining, rent, salary)

    @Test fun namesCompareLikeTheApiDoes() {
        assertTrue(sameName("  Food ", "food"))
        assertTrue(sameName("Eating   out", "eating out"))
        assertFalse(sameName("Food", "Foods"))
    }

    @Test fun aCategoryNeedsAUniqueName() {
        assertEquals("Give the category a name.", CategoryForm().problem(all, null)?.message)
        assertEquals("You already have a category called food.", CategoryForm(name = "food").problem(all, null)?.message)
        assertNull(CategoryForm(name = "Food").problem(all, "c1")) // renaming it to itself is fine
        assertNull(CategoryForm(name = "Travel").problem(all, null))
    }

    @Test fun theCreateBodyLeavesOutWhatIsAutomatic() {
        val j = CategoryForm(name = " Travel ").toJson()
        assertEquals("Travel", j["name"]!!.jsonPrimitive.content)
        assertFalse(j.containsKey("color")); assertFalse(j.containsKey("parent_id")); assertFalse(j.containsKey("kind"))
        val full = CategoryForm("Taxis", "blue", "c3", "need").toJson()
        assertEquals("need", full["kind"]!!.jsonPrimitive.content)
        assertEquals("c3", full["parent_id"]!!.jsonPrimitive.content)
    }

    @Test fun removingAParentOrAKindIsAnExplicitNull() {
        val before = categoryFormFrom(dining.copy(kind = "want"))
        val j = before.copy(parentId = null, kind = null).patchJson(before)
        assertEquals(setOf("parent_id", "kind"), j.keys)
        assertTrue(j["parent_id"] is JsonNull)
        assertTrue(before.patchJson(before).isEmpty())
    }

    @Test fun parentsAreTopLevelOnly() {
        assertEquals(listOf("c1", "c3", "c4"), parentChoices(all, null).map { it.id })
        assertEquals(listOf("c1", "c4"), parentChoices(all, rent).map { it.id }) // not itself
        assertTrue(parentChoices(all, food).isEmpty()) // it has sub-categories already
        assertTrue(parentChoices(all, salary).isEmpty()) // the default category takes none
    }

    @Test fun aCategoryCanBeMergedIntoAnyOther() {
        assertEquals(listOf("c1", "c3", "c4"), mergeTargets(all, dining).map { it.id })
    }

    @Test fun tagsNeedAUniqueName() {
        val tags = listOf(Tag("t1", "trip"))
        assertEquals("Give the tag a name.", tagProblem(" ", tags, null)?.message)
        assertEquals("You already have a tag called Trip.", tagProblem("Trip", tags, null)?.message)
        assertNull(tagProblem("trip", tags, "t1"))
        assertEquals("work", tagJson(" work ")["name"]!!.jsonPrimitive.content)
    }

    @Test fun aVendorBodyHoldsOnlyWhatWasFilled() {
        assertEquals("Give the vendor a name.", VendorForm().problem()?.message)
        val j = VendorForm(name = "Ensis", defaultCategory = "Groceries", defaultTags = listOf("weekly"), isLocal = true, currency = "MVR").toJson()
        assertEquals("Groceries", j["default_category"]!!.jsonPrimitive.content)
        assertEquals("weekly", j["default_tags"]!!.jsonArray.first().jsonPrimitive.content)
        assertEquals("true", j["is_local"]!!.jsonPrimitive.content)
        assertFalse(j.containsKey("address"))
    }

    @Test fun clearingAVendorsDefaultsIsExplicit() {
        val before = VendorForm("Ensis", "Majeedhee Magu", "", "MVR", true, "Groceries", listOf("weekly"))
        val j = before.copy(address = "", defaultCategory = "", defaultTags = emptyList(), isLocal = null).patchJson(before)
        assertEquals(setOf("address", "default_category", "default_tags", "is_local"), j.keys)
        assertTrue(j["address"] is JsonNull)
        assertEquals(0, j["default_tags"]!!.jsonArray.size)
        assertTrue(before.patchJson(before).isEmpty())
    }

    @Test fun localityAndKindHaveWords() {
        assertEquals("Local", localityLabel(true)); assertEquals("Foreign", localityLabel(false)); assertNull(localityLabel(null))
        assertEquals("Need", kindLabel("need")); assertNull(kindLabel(null))
    }

    @Test fun aMergeBodyNamesItsTarget() {
        assertEquals("c1", mergeJson("c1")["into_id"]!!.jsonPrimitive.content)
    }

    @Test fun aVendorsUsualPlaceTravelsWithTheForm() {
        val v = Vendor("v", "Ensis Mart", latitude = "4.175500", longitude = "73.509400", place = "Ensis")
        val f = vendorFormFrom(v)
        assertEquals("4.175500", f.latitude); assertEquals("Ensis", f.place)
        assertEquals(4.1755, f.toJson()["latitude"]!!.toString().trim('"').toDouble(), 1e-9)
        // nothing changed: nothing sent; a moved pin sends all three; removing it sends three nulls
        assertEquals(0, f.patchJson(f).size)
        assertEquals("73.510000", f.copy(longitude = "73.510000").patchJson(f)["longitude"]!!.toString().trim('"'))
        assertEquals("""{"latitude":null,"longitude":null,"place":null}""", f.copy(latitude = "", longitude = "", place = "").patchJson(f).toString())
        assertEquals(false, VendorForm(name = "x").toJson().containsKey("latitude"))
    }

    @Test fun theSalaryCategoryIsNotSortedIntoNeedsAndWants() {
        assertEquals(listOf("c1", "c2", "c3"), sortableCategories(all).map { it.id })
        assertEquals(setOf("c1", "c2", "c3"), startingKinds(all).keys)
    }

    @Test fun aSubCategoryThatTakesItsParentsKindIsSorted() {
        assertEquals(3, unsortedCount(all))
        val sorted = listOf(food.copy(kind = "need", effectiveKind = "need"), dining.copy(effectiveKind = "need"), rent)
        assertEquals(1, unsortedCount(sorted)) // Dining takes Food's, so only Rent is left
        assertEquals("Needs and wants (1 not sorted)", sortKindsButtonLabel(1))
        assertEquals("Needs and wants", sortKindsButtonLabel(0))
    }

    @Test fun onlyWhatChangedIsSentOneRequestPerKind() {
        val start = startingKinds(all)
        assertEquals(0, changedKindCount(all, start))
        assertTrue(kindRequests(all, start).isEmpty())
        val picked = start + mapOf("c1" to "need", "c2" to "need", "c3" to "want")
        assertEquals(3, changedKindCount(all, picked))
        val requests = kindRequests(all, picked)
        assertEquals(2, requests.size)
        val need = requests.first { it["kind"]?.jsonPrimitive?.content == "need" }
        assertEquals(listOf("c1", "c2"), need["ids"]!!.jsonArray.map { it.jsonPrimitive.content })
    }

    @Test fun clearingAKindIsAnExplicitNullAndBigSetsAreSplit() {
        val sorted = listOf(food.copy(kind = "need"), dining, rent)
        val cleared = kindRequests(sorted, startingKinds(sorted) + ("c1" to null))
        assertEquals(1, cleared.size)
        assertTrue(cleared[0]["kind"] is JsonNull)
        val many = (1..1200).map { Category("x$it", "C$it") }
        val requests = kindRequests(many, startingKinds(many).mapValues { "want" })
        assertEquals(listOf(500, 500, 200), requests.map { it["ids"]!!.jsonArray.size })
    }
}
