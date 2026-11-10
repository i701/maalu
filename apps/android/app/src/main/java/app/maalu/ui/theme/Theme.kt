package app.maalu.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialExpressiveTheme
import androidx.compose.material3.MotionScheme
import androidx.compose.material3.Shapes
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp

// The web's shape scale (--shape-*): cards rest at 28dp, inputs at 4dp.
private val MaaluShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

/**
 * Material 3 Expressive: the expressive motion scheme (springs) and the web app's colours and
 * shapes. Dynamic colour is deliberately off, so the app looks like the web app.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun MaaluTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialExpressiveTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        motionScheme = MotionScheme.expressive(),
        shapes = MaaluShapes,
        typography = MaaluTypography,
        content = content,
    )
}
