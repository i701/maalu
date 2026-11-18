package app.maalu.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.accentRoles
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AccentRolesTest {
    private fun hex(c: Color) = "#%02x%02x%02x".format(Math.round(c.red * 255), Math.round(c.green * 255), Math.round(c.blue * 255))
    private fun contrast(a: Color, b: Color): Double {
        val hi = maxOf(a.luminance(), b.luminance()).toDouble()
        val lo = minOf(a.luminance(), b.luminance()).toDouble()
        return (hi + 0.05) / (lo + 0.05)
    }

    // The expected values are what the web's accentRoles() gives for the same accent and scheme (lib/accent-roles.ts).
    @Test fun matchesTheWebForAmber() {
        val light = accentRoles("amber", dark = false)
        assertEquals("#845b00", hex(light.primary)); assertEquals("#ffffff", hex(light.onPrimary)); assertEquals("#f4e7ca", hex(light.primaryContainer))
        assertEquals("#382500", hex(light.onPrimaryContainer)); assertEquals("#dab970", hex(light.inversePrimary)); assertEquals("#f4ead5", hex(light.secondaryContainer))
        val dark = accentRoles("amber", dark = true)
        assertEquals("#ddb966", hex(dark.primary)); assertEquals("#3f2900", hex(dark.onPrimary)); assertEquals("#553e00", hex(dark.primaryContainer))
        assertEquals("#f0e3c7", hex(dark.onPrimaryContainer)); assertEquals("#392c0c", hex(dark.secondaryContainer))
    }

    @Test fun aGreyAccentStaysGreyAndAVividOneKeepsItsHue() {
        assertEquals("#55647b", hex(accentRoles("slate", dark = false).primary))
        assertEquals("#b0bfd4", hex(accentRoles("slate", dark = true).primary))
        assertEquals("#6752a6", hex(accentRoles("violet", dark = false).primary))
        assertEquals("#443969", hex(accentRoles("violet", dark = true).primaryContainer))
    }

    @Test fun everyAccentKeepsTextReadableInBothSchemes() {
        for (name in Accents.keys) for (dark in listOf(false, true)) {
            val r = accentRoles(name, dark)
            assertTrue("$name $dark on primary", contrast(r.onPrimary, r.primary) >= 4.5)
            assertTrue("$name $dark on container", contrast(r.onPrimaryContainer, r.primaryContainer) >= 4.5)
            assertTrue("$name $dark on secondary container", contrast(r.onSecondaryContainer, r.secondaryContainer) >= 4.5)
        }
    }
}
