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
import app.maalu.data.formatMoney
import app.maalu.data.formatMoneyShort
import app.maalu.ui.theme.MoneyStyle
import kotlinx.coroutines.launch

/**
 * An amount in a tight place: short from 10,000 up ("MVR 513.58M"), and a tap shows the exact figure.
 * When the short form is the full figure there is nothing to reveal and it is plain text.
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
) {
    val short = formatMoneyShort(amount, currency)
    val full = formatMoney(amount, currency)
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
