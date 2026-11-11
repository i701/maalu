package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class PlacesLogicTest {
    private val today = LocalDate.of(2026, 11, 11)

    @Test fun rangesStandForWholeMonths() {
        assertEquals(LocalDate.of(2026, 11, 1) to LocalDate.of(2026, 11, 30), placeRangeBounds(PlaceRange.Month, today))
        assertEquals(LocalDate.of(2026, 9, 1) to LocalDate.of(2026, 11, 30), placeRangeBounds(PlaceRange.Three, today))
        assertEquals(LocalDate.of(2026, 1, 1) to LocalDate.of(2026, 12, 31), placeRangeBounds(PlaceRange.Year, today))
        assertNull(placeRangeBounds(PlaceRange.All, today))
    }

    @Test fun coordinatesAreReadAndWritten() {
        assertEquals(4.1755 to 73.5093, parseCoordinates("4.1755, 73.5093"))
        assertEquals(4.1755 to 73.5093, parseCoordinates(" 4.1755  73.5093 "))
        assertEquals(-33.86 to 151.2, parseCoordinates("-33.86;151.2"))
        assertNull(parseCoordinates("4.1755")); assertNull(parseCoordinates("91, 10")); assertNull(parseCoordinates("10, 181")); assertNull(parseCoordinates("a, b"))
        assertEquals("4.175500", toCoordinate(4.1755)); assertEquals("-0.000100", toCoordinate(-0.0001))
        assertEquals(-170.0, wrapLongitude(190.0), 0.0); assertEquals(170.0, wrapLongitude(-190.0), 0.0); assertEquals(73.5, wrapLongitude(73.5), 0.0)
        assertEquals("4.1755, 73.5093", formatCoordinates("4.175500", "73.509300"))
        assertEquals("Super Mart", placeLabel("Super Mart", "4.1", "73.5")); assertEquals("4.1, 73.5", placeLabel(null, "4.100000", "73.500000")); assertEquals("", placeLabel("", null, null))
    }

    @Test fun circlesGrowWithSpendButStayInBounds() {
        assertEquals(30f, spotRadius("500", "500"), 0.001f)
        assertEquals(9f, spotRadius("0", "500"), 0.001f)
        assertEquals(9f, spotRadius("10", "0"), 0.001f)
        val small = spotRadius("5", "500"); val mid = spotRadius("125", "500")
        assertTrue(small in 9f..30f); assertTrue(mid > small)
        assertEquals("120.5", biggestSpend(listOf(PlaceTotal("1", "2", spent = "30"), PlaceTotal("1", "2", spent = "120.5"))))
        assertEquals("0", biggestSpend(emptyList()))
    }

    @Test fun theFormCarriesTheSpotBothWays() {
        val acc = Account("a", "Cash", "cash", "MVR", "0", "0")
        val marked = AddForm(amount = "20", accountId = "a", category = "Food", latitude = "4.175500", longitude = "73.509300", place = " Super Mart ")
        val json = marked.toJson(listOf(acc), "MVR").toString()
        assertTrue(json, json.contains("\"latitude\":\"4.175500\"") && json.contains("\"longitude\":\"73.509300\"") && json.contains("\"place\":\"Super Mart\""))
        // no spot, nothing sent
        assertTrue(!AddForm(amount = "20", accountId = "a", category = "Food").toJson(listOf(acc), "MVR").toString().contains("latitude"))
        // editing: a changed spot goes as the three fields, removing it sends explicit nulls
        val before = marked.copy(place = "Super Mart")
        assertEquals("{}", marked.copy(place = "Super Mart").patchJson(before, listOf(acc), "MVR").toString())
        assertEquals("""{"latitude":null,"longitude":null,"place":null}""", before.copy(latitude = "", longitude = "", place = "").patchJson(before, listOf(acc), "MVR").toString())
        assertEquals("""{"latitude":"4.2","longitude":"73.5","place":null}""", before.copy(latitude = "4.2", longitude = "73.5", place = "").patchJson(before, listOf(acc), "MVR").toString())
        val t = Transaction(id = "t", type = "expense", amount = "20", currency = "MVR", category = "Food", date = "2026-11-01", latitude = "4.175500", longitude = "73.509300", place = "Super Mart")
        assertTrue(t.hasPlace()); assertEquals("73.509300", formFrom(t).longitude); assertEquals("Super Mart", formFrom(t).place)
    }
}
