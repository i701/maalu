package app.maalu.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.unit.dp
import app.maalu.data.Budget
import app.maalu.data.CategoryLimit
import app.maalu.data.CategorySpend
import app.maalu.data.CategoryTotals
import app.maalu.data.formatMoney
import app.maalu.data.statusLabel
import app.maalu.ui.theme.Accents

/** What the Categories screen shows of one month; a part that could not be loaded is null and left out. */
data class CategoryMonth(val month: String, val totals: CategoryTotals?, val budget: Budget?, val spend: Map<String, CategorySpend>)

val LimitRingSize = 44.dp

/** Amber, orange and red are left out: they mean "getting close". The web's order, pink first. */
private val LimitHues = listOf("pink", "blue", "violet", "green", "lime", "slate")

/** A limit's own hue, or the error colour once it is close to its level or over it. */
@Composable
private fun limitColor(limit: CategoryLimit): Color =
    if (limit.status != "ok") MaterialTheme.colorScheme.error else Accents.getValue(LimitHues[limit.place.coerceAtLeast(0) % LimitHues.size])

/** "Food limit: MVR 900 of MVR 1,800 (50%), on track". */
fun limitText(limit: CategoryLimit, currency: String): String =
    "${limit.name} limit: ${formatMoney(limit.spent, currency)} of ${formatMoney(limit.total.toPlainString(), currency)} (${limit.percent}%), ${statusLabel(limit.status).lowercase()}"

/** How much of a limit is used. A limit covers several categories, so this is the limit's figure; the ring stops at full. */
@Composable
fun LimitRing(limit: CategoryLimit, currency: String) {
    val text = limitText(limit, currency)
    Box(Modifier.size(LimitRingSize).clearAndSetSemantics { contentDescription = text }, contentAlignment = Alignment.Center) {
        CircularProgressIndicator(
            progress = { (limit.percent / 100f).coerceIn(0f, 1f) }, modifier = Modifier.size(LimitRingSize),
            color = limitColor(limit), trackColor = MaterialTheme.colorScheme.surfaceContainerHighest, strokeWidth = 4.dp,
        )
        Text("${limit.percent}%", style = MaterialTheme.typography.labelSmall)
    }
}
