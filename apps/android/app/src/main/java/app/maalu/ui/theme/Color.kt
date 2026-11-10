package app.maalu.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

// The same roles as apps/web/src/lib/m3.ts (M3_LIGHT / M3_DARK): neutral surfaces, blue primary.
// Keep the two in step; the web file is the source of truth.

val LightColors: ColorScheme = lightColorScheme(
    primary = Color(0xFF1976D2),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFD3E4FF),
    onPrimaryContainer = Color(0xFF001C3B),
    inversePrimary = Color(0xFFA5C8FF),
    secondary = Color(0xFF5D5E62),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFE4E4E8),
    onSecondaryContainer = Color(0xFF1A1B1E),
    tertiary = Color(0xFF515E7D),
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFFD8E2FF),
    onTertiaryContainer = Color(0xFF394764),
    error = Color(0xFFBA1A1A),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF93000A),
    background = Color(0xFFFFFFFF),
    onBackground = Color(0xFF1A1B1E),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF1A1B1E),
    surfaceVariant = Color(0xFFE1E1E5),
    onSurfaceVariant = Color(0xFF47484C),
    surfaceDim = Color(0xFFDCDCE0),
    surfaceBright = Color(0xFFFFFFFF),
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFF6F6F8),
    surfaceContainer = Color(0xFFF0F0F3),
    surfaceContainerHigh = Color(0xFFEAEAED),
    surfaceContainerHighest = Color(0xFFE4E4E8),
    inverseSurface = Color(0xFF2F3033),
    inverseOnSurface = Color(0xFFF1F0F4),
    outline = Color(0xFF77777B),
    outlineVariant = Color(0xFFC9C9CD),
)

val DarkColors: ColorScheme = darkColorScheme(
    primary = Color(0xFF90CAF9),
    onPrimary = Color(0xFF0B2E4F),
    primaryContainer = Color(0xFF0D4A8A),
    onPrimaryContainer = Color(0xFFD3E4FF),
    inversePrimary = Color(0xFF1976D2),
    secondary = Color(0xFFC4C4C8),
    onSecondary = Color(0xFF2E2E32),
    secondaryContainer = Color(0xFF38383D),
    onSecondaryContainer = Color(0xFFE5E5E8),
    tertiary = Color(0xFFB8C6EA),
    onTertiary = Color(0xFF22304C),
    tertiaryContainer = Color(0xFF394764),
    onTertiaryContainer = Color(0xFFD8E2FF),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    background = Color(0xFF0A0A0B),
    onBackground = Color(0xFFE5E5E8),
    surface = Color(0xFF0A0A0B),
    onSurface = Color(0xFFE5E5E8),
    surfaceVariant = Color(0xFF3B3B40),
    onSurfaceVariant = Color(0xFFC4C4C8),
    surfaceDim = Color(0xFF0A0A0B),
    surfaceBright = Color(0xFF2E2E32),
    surfaceContainerLowest = Color(0xFF050506),
    surfaceContainerLow = Color(0xFF121214),
    surfaceContainer = Color(0xFF17171A),
    surfaceContainerHigh = Color(0xFF1F1F23),
    surfaceContainerHighest = Color(0xFF28282C),
    inverseSurface = Color(0xFFE5E5E8),
    inverseOnSurface = Color(0xFF2F3033),
    outline = Color(0xFF8E8E93),
    outlineVariant = Color(0xFF3B3B40),
)

/** Money colours that are not roles: green in, orange out (not red/green, for colour-blind readers). */
object ChartColors {
    val IncomeLight = Color(0xFF10B981)
    val IncomeDark = Color(0xFF059669)
    val ExpenseLight = Color(0xFFF97316)
    val ExpenseDark = Color(0xFFEA580C)
    val Line = Color(0xFF3B82F6)
}

/** Category and tag accents by name (apps/web/src/lib/m3.ts ACCENT). */
val Accents: Map<String, Color> = mapOf(
    "violet" to Color(0xFF8B5CF6),
    "orange" to Color(0xFFF97316),
    "amber" to Color(0xFFEAB308),
    "blue" to Color(0xFF3B82F6),
    "green" to Color(0xFF10B981),
    "lime" to Color(0xFF84CC16),
    "pink" to Color(0xFFEC4899),
    "slate" to Color(0xFF64748B),
)

/** Deep two-stop gradients for tiles with white text on them (GRADIENT in m3.ts). */
object Gradients {
    val Emerald = listOf(Color(0xFF0F8A64), Color(0xFF04483A))
    val Rose = listOf(Color(0xFFB3263F), Color(0xFF5F0F26))
    val Blue = listOf(Color(0xFF1565C0), Color(0xFF0D3C78))
}

/** The order accents are handed out in when many chips sit side by side, so neighbours differ. */
private val ChipPalette = listOf("blue", "violet", "pink", "amber", "green", "orange", "lime", "slate")

/** The i-th colour of the palette, cycling. */
fun paletteTint(i: Int): Color = Accents.getValue(ChipPalette[Math.floorMod(i, ChipPalette.size)])

/** A stable colour for a thing with an id (a tag): the same tag is the same colour in the sheet and on its chip. */
fun idTint(id: String): Color = paletteTint(id.hashCode())

fun methodTint(method: String): Color = when (method) {
    "cash" -> Accents.getValue("green")
    "bank_transfer" -> Accents.getValue("blue")
    "debit_card" -> Accents.getValue("violet")
    "credit_card" -> Accents.getValue("pink")
    else -> Accents.getValue("slate")
}

/** Needs are the blue of the net-worth line, wants the orange of expenses, as on the dashboard card. */
fun kindTint(kind: String): Color = when (kind) {
    "need" -> Accents.getValue("blue")
    "want" -> Accents.getValue("orange")
    else -> Accents.getValue("slate")
}
