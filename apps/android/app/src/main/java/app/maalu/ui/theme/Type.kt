package app.maalu.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight

/** The default Material scale (Roboto on Android) with tabular figures so amounts line up. */
private val Base = Typography()

val MaaluTypography = Typography(
    titleLarge = Base.titleLarge,
    bodyLarge = Base.bodyLarge,
    bodyMedium = Base.bodyMedium,
    labelLarge = Base.labelLarge,
)

/** For any amount: semibold, equal-width digits. */
val MoneyStyle = TextStyle(fontWeight = FontWeight.SemiBold, fontFeatureSettings = "tnum")
