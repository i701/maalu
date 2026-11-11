package app.maalu.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.maalu.data.otpDigits
import app.maalu.ui.theme.MoneyStyle

/**
 * A one-time-code input: one box per digit, centred, the active box ringed with a blinking caret. It is one invisible text
 * field under the boxes, so the number keyboard, backspace and pasting a whole code all work as people expect. [onComplete]
 * runs when the last digit is in.
 */
@Composable
fun OtpInput(
    value: String,
    onChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    length: Int = 6,
    enabled: Boolean = true,
    isError: Boolean = false,
    autoFocus: Boolean = false,
    onComplete: ((String) -> Unit)? = null,
) {
    val focus = remember { FocusRequester() }
    var focused by remember { mutableStateOf(false) }
    if (autoFocus) LaunchedEffect(Unit) { focus.requestFocus() }
    val caret by rememberInfiniteTransition(label = "caret").animateFloat(
        initialValue = 1f, targetValue = 0f, animationSpec = infiniteRepeatable(tween(530), RepeatMode.Reverse), label = "caret",
    )
    val active = value.length.coerceAtMost(length - 1)

    BasicTextField(
        value = value,
        onValueChange = { raw ->
            val digits = otpDigits(raw, length)
            if (digits != value) { onChange(digits); if (digits.length == length) onComplete?.invoke(digits) }
        },
        enabled = enabled,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        cursorBrush = SolidColor(Color.Transparent),
        textStyle = TextStyle(color = Color.Transparent),
        modifier = modifier
            .focusRequester(focus)
            .onFocusChanged { focused = it.isFocused }
            .semantics { contentDescription = "Code, ${value.length} of $length digits entered" },
        decorationBox = { inner ->
            Box(contentAlignment = Alignment.Center) {
                Row(Modifier.clearAndSetSemantics { }, horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    repeat(length) { i ->
                        // a wider gap in the middle reads as 123 456
                        if (i == length / 2 && length % 2 == 0) Spacer(Modifier.width(6.dp))
                        val isActive = focused && enabled && i == active
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = MaterialTheme.colorScheme.surfaceContainerHigh,
                            border = when {
                                isError -> BorderStroke(2.dp, MaterialTheme.colorScheme.error)
                                isActive -> BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
                                else -> null
                            },
                            modifier = Modifier.size(width = 46.dp, height = 56.dp),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                val digit = value.getOrNull(i)
                                if (digit != null) Text(digit.toString(), style = MaterialTheme.typography.headlineSmall.merge(MoneyStyle), fontWeight = FontWeight.SemiBold)
                                else if (isActive) Box(Modifier.alpha(caret).width(2.dp).height(24.dp).background(MaterialTheme.colorScheme.primary))
                            }
                        }
                    }
                }
                // the real field, invisible and over the boxes, so a tap anywhere focuses it and a long press can paste
                Box(Modifier.matchParentSize().alpha(0f)) { inner() }
            }
        },
    )
}
