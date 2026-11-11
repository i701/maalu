package app.maalu.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.maalu.data.qrMatrix

/**
 * A QR code drawn on the phone from [text]. It is always dark squares on white with a margin, in light and dark mode,
 * because a scanner needs that contrast.
 */
@Composable
fun QrCode(text: String, modifier: Modifier = Modifier, size: Dp = 220.dp, description: String = "QR code") {
    val matrix = remember(text) { qrMatrix(text) }
    Canvas(
        modifier
            .size(size)
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White)
            .padding(14.dp)
            .semantics { contentDescription = description },
    ) {
        val n = matrix.size
        val cell = this.size.width / n
        matrix.forEachIndexed { y, row ->
            row.forEachIndexed { x, dark ->
                if (dark) drawRect(Color.Black, Offset(x * cell, y * cell), Size(cell + 0.5f, cell + 0.5f))
            }
        }
    }
}
