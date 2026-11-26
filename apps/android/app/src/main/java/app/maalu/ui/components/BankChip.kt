package app.maalu.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.R
import app.maalu.data.BankBrand
import app.maalu.data.bankBrand
import app.maalu.ui.theme.tintSurface

/** The bank an account is with: its name and, for MIB and BML, the logo, in the bank's colour; grey for any other. */
@Composable
fun BankChip(bank: String, modifier: Modifier = Modifier) {
    val brand = bankBrand(bank)
    // the colours are the banks' own, as on the web
    val tint = when (brand) {
        BankBrand.Mib -> Color(0xFF006A4D)
        BankBrand.Bml -> Color(0xFFE21B23)
        null -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    // the theme in use, which can differ from the phone's
    val dark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    Surface(
        modifier,
        shape = MaterialTheme.shapes.small,
        color = tint.tintSurface(),
        contentColor = if (brand != null && dark) lerp(tint, Color.White, 0.5f) else tint,
    ) {
        Row(
            Modifier.padding(start = 8.dp, end = if (brand == null) 8.dp else 5.dp, top = 3.dp, bottom = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Text(bank, Modifier.weight(1f, fill = false), style = MaterialTheme.typography.labelSmallEmphasized, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (brand != null) Image(
                painterResource(if (brand == BankBrand.Mib) R.drawable.bank_mib else R.drawable.bank_bml),
                contentDescription = null, // the chip's text already names the bank
                modifier = Modifier.size(16.dp).clip(RoundedCornerShape(4.dp)),
            )
        }
    }
}
