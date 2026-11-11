package app.maalu.data

// The money-flow diagram: income categories into one total, out to spending categories. Money earned and not spent is a "Saved" use; money
// spent beyond what came in is an "Overspent" source, so both sides always add up to the same total.

enum class FlowKind { Income, Deficit, Total, Spending, Saved }

data class FlowNode(val id: String, val label: String, val column: Int, val value: Double, val kind: FlowKind)
data class FlowLink(val source: String, val target: String, val value: Double)
data class MoneyFlow(val nodes: List<FlowNode>, val links: List<FlowLink>, val income: Double, val spent: Double)

private data class FlowRow(val label: String, val value: Double)

/** The [top] biggest rows, the rest folded into one "Other" row; empty and negative ones dropped. */
private fun biggest(rows: List<FlowRow>, top: Int, other: String): List<FlowRow> {
    val sorted = rows.filter { it.value > 0 }.sortedByDescending { it.value }
    if (sorted.size <= top + 1) return sorted // one "Other" would hide a single row: show it
    return sorted.take(top) + FlowRow(other, sorted.drop(top).sumOf { it.value })
}

private fun rowsOf(categories: List<CategoryTotal>, type: String): List<FlowRow> =
    categories.filter { it.type == type }.map { FlowRow(it.category, it.total.toDoubleOrNull() ?: 0.0) }

/** Where a period's money came from and where it went; null when there is neither income nor spending. */
fun moneyFlow(categories: List<CategoryTotal>, top: Int = 5): MoneyFlow? {
    val sources = biggest(rowsOf(categories, "income"), top, "Other income")
    val uses = biggest(rowsOf(categories, "expense"), top, "Other spending")
    val income = sources.sumOf { it.value }
    val spent = uses.sumOf { it.value }
    if (income == 0.0 && spent == 0.0) return null
    val total = maxOf(income, spent)
    val nodes = mutableListOf<FlowNode>()
    val links = mutableListOf<FlowLink>()
    sources.forEachIndexed { i, r -> nodes += FlowNode("in:$i", r.label, 0, r.value, FlowKind.Income); links += FlowLink("in:$i", "total", r.value) }
    if (spent > income) { val gap = spent - income; nodes += FlowNode("deficit", "Overspent", 0, gap, FlowKind.Deficit); links += FlowLink("deficit", "total", gap) }
    nodes += FlowNode("total", "Total", 1, total, FlowKind.Total)
    uses.forEachIndexed { i, r -> nodes += FlowNode("out:$i", r.label, 2, r.value, FlowKind.Spending); links += FlowLink("total", "out:$i", r.value) }
    if (income > spent) { val kept = income - spent; nodes += FlowNode("saved", "Saved", 2, kept, FlowKind.Saved); links += FlowLink("total", "saved", kept) }
    return MoneyFlow(nodes, links, income, spent)
}

data class PlacedNode(val node: FlowNode, val x: Double, val y: Double, val width: Double, val height: Double)

/** A link's centre line from the source to the target, to be stroked [thickness] wide: a curve with both control points at the middle x. */
data class PlacedLink(val link: FlowLink, val x0: Double, val y0: Double, val x1: Double, val y1: Double, val thickness: Double)

data class FlowLayout(val nodes: List<PlacedNode>, val links: List<PlacedLink>)

/**
 * Positions the nodes and links in a [width] by [height] box: one column per side with the total in the middle, heights in proportion to the
 * money (the same scale everywhere), each column centred vertically, links stacked along the sides of the nodes in the order of the nodes. A
 * node never gets thinner than [minHeight], so a tiny category stays visible.
 */
fun layoutFlow(flow: MoneyFlow, width: Double, height: Double, nodeWidth: Double = 12.0, gap: Double = 8.0, minHeight: Double = 4.0): FlowLayout {
    val total = flow.nodes.firstOrNull { it.kind == FlowKind.Total }?.value ?: 1.0
    val columns = (0..2).map { c -> flow.nodes.filter { it.column == c } }
    val tallest = columns.maxOf { it.size }
    val scale = maxOf(0.0, height - gap * (tallest - 1)) / total
    val xs = listOf(0.0, (width - nodeWidth) / 2, width - nodeWidth)
    val placed = LinkedHashMap<String, PlacedNode>()
    columns.forEachIndexed { c, col ->
        val heights = col.map { maxOf(minHeight, it.value * scale) }
        val used = heights.sum() + gap * maxOf(0, col.size - 1)
        var y = (height - used) / 2
        col.forEachIndexed { i, n -> placed[n.id] = PlacedNode(n, xs[c], y, nodeWidth, heights[i]); y += heights[i] + gap }
    }
    fun spanOut(n: PlacedNode) = flow.links.filter { it.source == n.node.id }.sumOf { it.value * scale }
    fun spanIn(n: PlacedNode) = flow.links.filter { it.target == n.node.id }.sumOf { it.value * scale }
    val outCursor = HashMap<String, Double>()
    val inCursor = HashMap<String, Double>()
    val links = flow.links.map { link ->
        val from = placed.getValue(link.source)
        val to = placed.getValue(link.target)
        val thickness = link.value * scale
        val startTop = outCursor[from.node.id] ?: (from.y + (from.height - spanOut(from)) / 2)
        val endTop = inCursor[to.node.id] ?: (to.y + (to.height - spanIn(to)) / 2)
        outCursor[from.node.id] = startTop + thickness
        inCursor[to.node.id] = endTop + thickness
        PlacedLink(link, from.x + from.width, startTop + thickness / 2, to.x, endTop + thickness / 2, thickness)
    }
    return FlowLayout(placed.values.toList(), links)
}

/** Keeps stacked labels apart: each centre at least [gap] from the one above, kept inside 0..[limit] (port of spreadLabels). */
fun spreadLabels(centers: List<Double>, gap: Double, limit: Double): List<Double> {
    val order = centers.indices.sortedBy { centers[it] }
    val out = centers.toMutableList()
    var last = Double.NEGATIVE_INFINITY
    for (i in order) { out[i] = maxOf(centers[i], last + gap); last = out[i] }
    var next = limit
    for (i in order.reversed()) { out[i] = minOf(out[i], next); next = out[i] - gap }
    return out.map { maxOf(0.0, it) }
}
