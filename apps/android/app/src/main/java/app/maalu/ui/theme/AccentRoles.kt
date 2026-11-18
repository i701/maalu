package app.maalu.ui.theme

import androidx.compose.ui.graphics.Color
import kotlin.math.atan2
import kotlin.math.cbrt
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin

/** The primary family of colour roles an accent gives a page (the web's lib/accent-roles.ts). */
data class AccentRoles(
    val primary: Color,
    val onPrimary: Color,
    val primaryContainer: Color,
    val onPrimaryContainer: Color,
    val inversePrimary: Color,
    val secondaryContainer: Color,
    val onSecondaryContainer: Color,
)

// [lightness, chroma] of each role in OKLCH, light then dark scheme. The hue comes from the accent, so every accent has the same contrast.
private val LightTones = arrayOf(0.5 to 0.13, 1.0 to 0.0, 0.93 to 0.04, 0.28 to 0.07, 0.8 to 0.1, 0.94 to 0.03, 0.3 to 0.06)
private val DarkTones = arrayOf(0.8 to 0.11, 0.3 to 0.08, 0.38 to 0.08, 0.92 to 0.04, 0.5 to 0.13, 0.3 to 0.05, 0.92 to 0.03)

private fun lin(c: Double) = if (c <= 0.04045) c / 12.92 else ((c + 0.055) / 1.055).pow(2.4)
private fun gam(c: Double) = if (c <= 0.0031308) 12.92 * c else 1.055 * c.pow(1 / 2.4) - 0.055
private fun channel(v: Double) = (gam(v.coerceIn(0.0, 1.0)) * 255).roundToInt()

/** A colour's hue (degrees) and chroma in OKLCH. */
fun hueAndChroma(color: Color): Pair<Double, Double> {
    val r = lin(color.red.toDouble()); val g = lin(color.green.toDouble()); val b = lin(color.blue.toDouble())
    val l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    val m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    val s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    val a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    val bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    return ((Math.toDegrees(atan2(bb, a)) + 360) % 360) to hypot(a, bb)
}

/** OKLCH to sRGB; a colour outside sRGB is clipped. */
fun oklch(lightness: Double, chroma: Double, hue: Double): Color {
    val a = chroma * cos(Math.toRadians(hue))
    val b = chroma * sin(Math.toRadians(hue))
    val l = (lightness + 0.3963377774 * a + 0.2158037573 * b).pow(3)
    val m = (lightness - 0.1055613458 * a - 0.0638541728 * b).pow(3)
    val s = (lightness - 0.0894841775 * a - 1.291485548 * b).pow(3)
    return Color(
        channel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        channel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        channel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    )
}

/** The roles of an accent (a name in [Accents]) for one scheme. A grey accent such as slate keeps its roles grey. */
fun accentRoles(accent: String, dark: Boolean): AccentRoles {
    val (hue, chroma) = hueAndChroma(Accents.getValue(accent))
    val k = minOf(1.0, chroma / 0.13)
    val tones = if (dark) DarkTones else LightTones
    fun at(i: Int) = oklch(tones[i].first, tones[i].second * k, hue)
    return AccentRoles(at(0), at(1), at(2), at(3), at(4), at(5), at(6))
}
