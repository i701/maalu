@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import app.maalu.ui.components.glowTopBarColors
import app.maalu.ui.components.glowBackground
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.OpenInFull
import androidx.compose.material.icons.outlined.ZoomIn
import androidx.compose.material.icons.outlined.ZoomOut
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.util.lerp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.maalu.data.CategoryTotal
import app.maalu.data.FlowKind
import app.maalu.data.FlowLayout
import app.maalu.data.MoneyFlow
import app.maalu.data.PlacedLink
import app.maalu.data.flowShareText
import app.maalu.data.formatMoney
import app.maalu.data.gradientKinds
import app.maalu.data.layoutFlow
import app.maalu.data.moneyFlow
import app.maalu.data.nodeIdAt
import app.maalu.data.outerNodeId
import app.maalu.data.span
import app.maalu.data.spreadLabels
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.MoneyStyle

// The diagram's measures, the same as the iOS one: thin bars, 88dp side labels, a 290dp-tall box, and three band strengths.
private val LabelWidth = 88.dp
private const val DiagramHeight = 290f
private const val RowHeight = 38f
private const val NodeWidth = 4.0
private const val LabelHeight = 34.0
private const val BandAlpha = 0.32f
private const val SelectedAlpha = 0.55f
private const val DimmedAlpha = 0.12f

// The expanded canvas: wide, scrollable both ways, zoomed by pinch or the buttons from fitting the screen up to 4x.
private const val ExpandedWidth = 640f
private const val ExpandedHeight = 600f
private const val MinZoom = 1f
private const val MaxZoom = 4f
private const val ZoomStep = 0.5f

/**
 * Where the month's money came from and where it went: income categories flow into one total and out to spending and what was kept. Tap a
 * band or a label to see its amount and share; expand it to a canvas of its own to zoom; or list every flow in a table.
 */
@Composable
fun MoneyFlowCard(categories: List<CategoryTotal>, currency: String) {
    val flow = remember(categories) { moneyFlow(categories) } ?: return
    var table by remember { mutableStateOf(false) }
    var expanded by remember { mutableStateOf(false) }
    SectionCard("Money flow", formatMoney(flow.nodes.first { it.kind == FlowKind.Total }.value.toString(), currency)) {
        if (table) FlowTable(flow, currency) else MoneyFlowDiagram(flow, currency)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(shapes = ButtonDefaults.shapes(), onClick = { table = !table }) { Text(if (table) "Show the diagram" else "Show as a table") }
            if (!table) TextButton(shapes = ButtonDefaults.shapes(), onClick = { expanded = true }) {
                Icon(Icons.Outlined.OpenInFull, null, Modifier.padding(end = 6.dp).height(18.dp))
                Text("Expand the diagram")
            }
        }
    }
    if (expanded) MoneyFlowExpanded(flow, currency) { expanded = false }
}

private fun flowColor(kind: FlowKind): Color = when (kind) {
    FlowKind.Income -> ChartColors.IncomeLight
    FlowKind.Deficit, FlowKind.Spending -> ChartColors.ExpenseLight
    FlowKind.Total, FlowKind.Saved -> ChartColors.Line
}

/** A band as a filled ribbon between two Bézier edges, so its thickness stays the same all along it (a thick stroke pinches where it bends steeply). */
private fun FlowLayout.ribbon(link: PlacedLink, density: Float): Path {
    val (startX, endX) = span(link)
    val s = (startX * density).toFloat()
    val e = (endX * density).toFloat()
    val mid = (s + e) / 2
    val half = link.thickness / 2
    val topS = ((link.y0 - half) * density).toFloat()
    val topE = ((link.y1 - half) * density).toFloat()
    val botS = ((link.y0 + half) * density).toFloat()
    val botE = ((link.y1 + half) * density).toFloat()
    return Path().apply {
        moveTo(s, topS)
        cubicTo(mid, topS, mid, topE, e, topE)
        lineTo(e, botE)
        cubicTo(mid, botE, mid, botS, s, botS)
        close()
    }
}

/**
 * The diagram itself. [size] fixes it (the expanded canvas); null fits it to the card. Selecting a band, bar or label dims the rest and
 * names it in the line under the diagram; tapping it again, or empty space, clears it.
 */
@Composable
private fun MoneyFlowDiagram(flow: MoneyFlow, currency: String, size: DpSize? = null) {
    // tied to the data: an id is a position in the list, so after a reload it could name another category
    var selectedId by remember(flow) { mutableStateOf<String?>(null) }
    // the last one picked stays while the dimming fades out after a clear
    var lastPicked by remember(flow) { mutableStateOf<String?>(null) }
    LaunchedEffect(selectedId) { if (selectedId != null) lastPicked = selectedId }
    val shown = selectedId ?: lastPicked
    val density = LocalDensity.current.density
    val focus by animateFloatAsState(if (selectedId != null) 1f else 0f, MaterialTheme.motionScheme.defaultEffectsSpec(), label = "focus")
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        BoxWithConstraints(if (size == null) Modifier.fillMaxWidth() else Modifier) {
            val width = size?.width ?: maxWidth
            // tall enough for a label per node of the fullest column
            val height = size?.height ?: maxOf(DiagramHeight, flow.tallestColumn * RowHeight).dp
            val layout = remember(flow, width, height) {
                layoutFlow(flow, (width - LabelWidth * 2).coerceAtLeast(0.dp).value.toDouble(), height.value.toDouble(), nodeWidth = NodeWidth)
            }
            fun select(id: String?) { selectedId = if (id == selectedId) null else id }
            Box(Modifier.width(width).height(height)) {
                Canvas(
                    Modifier.padding(horizontal = LabelWidth).fillMaxSize().pointerInput(layout) {
                        detectTapGestures { at -> select(layout.nodeIdAt(at.x / density.toDouble(), at.y / density.toDouble())) }
                    },
                ) {
                    layout.links.forEach { link ->
                        val (from, to) = layout.gradientKinds(link)
                        val goal = when (shown) { null -> BandAlpha; outerNodeId(link) -> SelectedAlpha; else -> DimmedAlpha }
                        val alpha = lerp(BandAlpha, goal, focus)
                        val (startX, endX) = layout.span(link)
                        drawPath(
                            layout.ribbon(link, density),
                            Brush.horizontalGradient(listOf(flowColor(from).copy(alpha), flowColor(to).copy(alpha)), (startX * density).toFloat(), (endX * density).toFloat()),
                        )
                    }
                    layout.nodes.filter { it.node.kind != FlowKind.Total }.forEach { n ->
                        val barAlpha = lerp(1f, if (shown == null || shown == n.node.id) 1f else 0.3f, focus)
                        drawRoundRect(
                            flowColor(n.node.kind).copy(barAlpha), Offset((n.x * density).toFloat(), (n.y * density).toFloat()),
                            Size((n.width * density).toFloat(), (n.height * density).toFloat()), CornerRadius(1.5f * density),
                        )
                    }
                }
                // labels at the sides, kept apart; the total bar is named in the card's header
                // with sub-categories the groups are labelled too, just left of their bars, over the bands coming in
                listOf(0, 2, 3).filter { it <= flow.lastColumn }.forEach { col ->
                    val inner = col == 2 && flow.lastColumn == 3
                    val leftOfBar = col == 0 || inner
                    val side = layout.nodes.filter { it.node.column == col }
                    val tops = spreadLabels(side.map { it.y + it.height / 2 - LabelHeight / 2 }, LabelHeight + 4, height.value - LabelHeight)
                    side.forEachIndexed { i, n ->
                        Column(
                            Modifier.width(LabelWidth - 8.dp)
                                .offset(x = when { col == 0 -> 0.dp; inner -> n.x.dp + 2.dp; else -> width - LabelWidth + 8.dp }, y = tops[i].dp)
                                .alpha(lerp(1f, if (shown == null || shown == n.node.id) 1f else 0.4f, focus))
                                .background(if (inner) MaterialTheme.colorScheme.surfaceContainerLow.copy(alpha = 0.7f) else Color.Transparent, RoundedCornerShape(4.dp))
                                .clickable { select(n.node.id) },
                            horizontalAlignment = if (leftOfBar) Alignment.End else Alignment.Start,
                        ) {
                            Text(n.node.label, style = MaterialTheme.typography.labelMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(formatMoney(n.node.value.toString(), currency), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
        }
        val picked = flow.nodes.firstOrNull { it.id == selectedId }
        val total = flow.nodes.first { it.kind == FlowKind.Total }.value
        // a live region, so a screen reader says the new line when the selection changes
        Box(Modifier.semantics { liveRegion = LiveRegionMode.Polite }) {
            if (picked != null) Text(
                "${picked.label} · ${formatMoney(picked.value.toString(), currency)} · ${flowShareText(picked.value, total)} of the total",
                style = MaterialTheme.typography.bodyMedium,
            ) else Text("Tap a band to see its amount and share.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** The diagram on a screen of its own: a wide canvas that scrolls both ways, with pinch to zoom or the zoom buttons. */
@Composable
private fun MoneyFlowExpanded(flow: MoneyFlow, currency: String, onClose: () -> Unit) {
    var zoom by remember { mutableFloatStateOf(MinZoom) }
    fun zoomTo(value: Float) { zoom = value.coerceIn(MinZoom, MaxZoom) }
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Scaffold(
            modifier = Modifier.glowBackground(), containerColor = androidx.compose.ui.graphics.Color.Transparent,
            topBar = {
                TopAppBar(
                    colors = glowTopBarColors(),
                    title = { Text("Money flow") },
                    navigationIcon = { TextButton(shapes = ButtonDefaults.shapes(), onClick = onClose) { Text("Done") } },
                    actions = {
                        IconButton(onClick = { zoomTo(zoom - ZoomStep) }, enabled = zoom > MinZoom) { Icon(Icons.Outlined.ZoomOut, "Zoom out") }
                        IconButton(onClick = { zoomTo(zoom + ZoomStep) }, enabled = zoom < MaxZoom) { Icon(Icons.Outlined.ZoomIn, "Zoom in") }
                    },
                )
            },
        ) { padding ->
            BoxWithConstraints(Modifier.padding(padding).fillMaxSize()) {
                val viewportW = maxWidth
                val viewportH = maxHeight
                // the scale at which the whole diagram fits the width of the screen, times how far in the person has zoomed
                val scale = minOf(1f, (viewportW.value - 8f) / ExpandedWidth) * zoom
                Box(
                    Modifier.fillMaxSize().pinchToZoom { zoomTo(zoom * it) }
                        .verticalScroll(rememberScrollState()).horizontalScroll(rememberScrollState()),
                ) {
                    Box(Modifier.defaultMinSize(minWidth = viewportW, minHeight = viewportH).padding(horizontal = 4.dp, vertical = 16.dp), contentAlignment = Alignment.Center) {
                        MoneyFlowDiagram(flow, currency, DpSize((ExpandedWidth * scale).dp, (maxOf(ExpandedHeight, flow.tallestColumn * RowHeight) * scale).dp))
                    }
                }
            }
        }
    }
}

/** Reports a pinch as a zoom factor and consumes it; a one-finger drag is left alone, so it still scrolls. */
private fun Modifier.pinchToZoom(onZoom: (Float) -> Unit): Modifier = pointerInput(Unit) {
    awaitEachGesture {
        awaitFirstDown(requireUnconsumed = false)
        do {
            val event = awaitPointerEvent(PointerEventPass.Initial)
            if (event.changes.size >= 2) {
                val factor = event.calculateZoom()
                if (factor != 1f) { onZoom(factor); event.changes.forEach { it.consume() } }
            }
        } while (event.changes.any { it.pressed })
    }
}

@Composable
private fun FlowTable(flow: MoneyFlow, currency: String) {
    val name = flow.nodes.associate { it.id to it.label }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        flow.links.forEach { l ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${name[l.source]} → ${name[l.target]}", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                Text(formatMoney(l.value.toString(), currency), style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle))
            }
        }
    }
}
