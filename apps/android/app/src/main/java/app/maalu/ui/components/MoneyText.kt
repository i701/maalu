package app.maalu.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.PlainTooltip
import androidx.compose.material3.Text
import androidx.compose.material3.TooltipAnchorPosition
import androidx.compose.material3.TooltipBox
import androidx.compose.material3.TooltipDefaults
import androidx.compose.material3.rememberTooltipState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import app.maalu.data.NumberPrefs
import app.maalu.data.formatMoneyFull
import app.maalu.data.formatMoneyShort
import app.maalu.ui.theme.MoneyStyle
import kotlinx.coroutines.launch

/** Where the short form starts in the tight places, when "Short numbers" is off. */
private const val TIGHT_FROM = 10_000L

/**
 * An amount that may be written short: from 10,000 up ("MVR 513.58M"), or from 1,000 up when the person switched on
 * "Short numbers" in Settings. A tap shows the exact figure. When nothing is shortened there is nothing to reveal and it
 * is plain text. [prefix] is a sign or "≈ " put before it, in both forms.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoneyText(
    amount: String,
    currency: String,
    modifier: Modifier = Modifier,
    style: TextStyle = TextStyle.Default,
    color: Color = Color.Unspecified,
    textAlign: TextAlign? = null,
    prefix: String = "",
) {
    val from = if (NumberPrefs.short) NumberPrefs.SHORT_FROM else TIGHT_FROM
    val short = prefix + formatMoneyShort(amount, currency, from)
    val full = prefix + formatMoneyFull(amount, currency)
    val look = style.merge(MoneyStyle)
    if (short == full) {
        Text(short, modifier, color = color, style = look, textAlign = textAlign)
        return
    }
    val tooltip = rememberTooltipState()
    val scope = rememberCoroutineScope()
    TooltipBox(
        positionProvider = TooltipDefaults.rememberTooltipPositionProvider(TooltipAnchorPosition.Above),
        tooltip = { PlainTooltip { Text(full) } },
        state = tooltip,
    ) {
        Text(short, modifier.clickable { scope.launch { tooltip.show() } }, color = color, style = look, textAlign = textAlign)
    }
}
