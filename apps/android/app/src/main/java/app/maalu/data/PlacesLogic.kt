package app.maalu.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.time.LocalDate

// Places: where spending went, and marking a transaction's spot on the map. Ported from apps/web/src/lib/places.ts.

/** Where the map starts when nothing is marked yet: Malé. */
const val DEFAULT_LAT = 4.1755
const val DEFAULT_LNG = 73.5093

@Serializable
data class PlaceTotal(
    val latitude: String,
    val longitude: String,
    val place: String? = null,
    val count: Int = 0,
    val spent: String = "0",
    @SerialName("last_date") val lastDate: String? = null,
) {
    val lat: Double get() = latitude.toDoubleOrNull() ?: DEFAULT_LAT
    val lng: Double get() = longitude.toDoubleOrNull() ?: DEFAULT_LNG
}

@Serializable
data class PlaceTotals(val currency: String, val places: List<PlaceTotal> = emptyList())

@Serializable
data class PlaceHit(val name: String, val address: String = "", val latitude: String, val longitude: String)

@Serializable
data class PlaceSearch(val results: List<PlaceHit> = emptyList(), val source: String = "")

enum class PlaceRange(val label: String) { Month("This month"), Three("3 months"), Year("This year"), All("All time") }

/** The first and last day a range covers (none for all time), given today's date. */
fun placeRangeBounds(range: PlaceRange, today: LocalDate): Pair<LocalDate, LocalDate>? = when (range) {
    PlaceRange.Month -> monthBounds(today)
    PlaceRange.Three -> today.minusMonths(2).withDayOfMonth(1) to monthBounds(today).second
    PlaceRange.Year -> LocalDate.of(today.year, 1, 1) to LocalDate.of(today.year, 12, 31)
    PlaceRange.All -> null
}

/** A coordinate as the API takes it: six decimals, no exponent. */
fun toCoordinate(n: Double): String = "%.6f".format(java.util.Locale.ENGLISH, n)

/** Longitude as a map reports it can run past the edge when the world is scrolled around; fold it back into -180 to 180. */
fun wrapLongitude(lng: Double): Double = (((lng + 180) % 360) + 360) % 360 - 180

/** "4.1755, 73.5093" (as copied from a map app) or "4.1755 73.5093" as numbers; null when it is not a pair of coordinates on the planet. */
fun parseCoordinates(text: String): Pair<Double, Double>? {
    val parts = text.trim().split(Regex("[\\s,;]+")).filter { it.isNotEmpty() }
    if (parts.size != 2) return null
    val lat = parts[0].toDoubleOrNull() ?: return null
    val lng = parts[1].toDoubleOrNull() ?: return null
    if (!lat.isFinite() || !lng.isFinite() || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
    return lat to lng
}

private fun fourDecimals(v: String): String = v.toBigDecimalOrNull()?.setScale(4, java.math.RoundingMode.HALF_EVEN)?.stripTrailingZeros()?.toPlainString() ?: v

/** "4.1755, 73.5093": enough digits to tell two shops apart, few enough to read. */
fun formatCoordinates(latitude: String, longitude: String): String = "${fourDecimals(latitude)}, ${fourDecimals(longitude)}"

/** A short label for a spot: its name, else its coordinates. */
fun placeLabel(place: String?, latitude: String?, longitude: String?): String = when {
    !place.isNullOrBlank() -> place
    latitude != null && longitude != null -> formatCoordinates(latitude, longitude)
    else -> ""
}

/** How big a spot's circle is, in dp, against the biggest spend on the map: area follows the amount, between [min] and [max]. */
fun spotRadius(spent: String, biggest: String, min: Float = 9f, max: Float = 30f): Float {
    val s = spent.toBigDecimalOrNull() ?: BigDecimal.ZERO
    val b = biggest.toBigDecimalOrNull() ?: BigDecimal.ZERO
    if (b.signum() <= 0 || s.signum() <= 0) return min
    val share = Math.sqrt(s.toDouble() / b.toDouble()).coerceIn(0.0, 1.0)
    return (min + (max - min) * share).toFloat()
}

/** The biggest spend among the spots, as a decimal string. */
fun biggestSpend(places: List<PlaceTotal>): String = places.maxOfOrNull { it.spent.toBigDecimalOrNull() ?: BigDecimal.ZERO }?.toPlainString() ?: "0"

/** A transaction is on the map when it has both coordinates. */
fun Transaction.hasPlace(): Boolean = latitude != null && longitude != null
