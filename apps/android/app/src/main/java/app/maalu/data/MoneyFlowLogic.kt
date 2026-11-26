package app.maalu.data

// The money-flow diagram: income categories into one total, out to spending groups, and from a group to its sub-categories. Money earned and not spent is a "Saved" use; money
// spent beyond what came in is an "Overspent" source, so both sides always add up to the same total.

enum class FlowKind { Income, Deficit, Total, Spending, Saved }

data class FlowNode(val id: String, val label: String, val column: Int, val value: Double, val kind: FlowKind)
data class FlowLink(val source: String, val target: String, val value: Double)
data class MoneyFlow(val nodes: List<FlowNode>, val links: List<FlowLink>, val income: Double, val spent: Double) {
    /** The right-most column in use: 2 for a flat flow, 3 when a spending group has sub-categories under it. */
    val lastColumn: Int get() = nodes.maxOf { it.column }

    /** How many nodes the fullest column holds, which sets the height a diagram needs. */
    val tallestColumn: Int get() = nodes.groupBy { it.column }.values.maxOf { it.size }
}

private data class FlowRow(val label: String, val value: Double, val children: List<FlowRow> = emptyList())

/** The [top] biggest rows, the rest folded into one "Other" row; empty and negative ones dropped. */
private fun biggest(rows: List<FlowRow>, top: Int, other: String): List<FlowRow> {
    val sorted = rows.filter { it.value > 0 }.sortedByDescending { it.value }
    if (sorted.size <= top + 1) return sorted // one "Other" would hide a single row: show it
    return sorted.take(top) + FlowRow(other, sorted.drop(top).sumOf { it.value })
}

private fun rowsOf(categories: List<CategoryTotal>, type: String): List<FlowRow> =
    categories.filter { it.type == type }.map { FlowRow(it.category, it.total.toDoubleOrNull() ?: 0.0) }

/**
 * Spending as groups: a sub-category goes under its parent, and a parent's own spending becomes an "(other)" child beside its
 * sub-categories. A category with no parent and no children is a group of its own with nothing under it.
 */
private fun spendingGroups(categories: List<CategoryTotal>): List<FlowRow> =
    categories.filter { it.type == "expense" && (it.total.toDoubleOrNull() ?: 0.0) > 0 }
        .groupBy { it.parentId ?: it.categoryId }
        .map { (_, family) ->
            val (subs, own) = family.partition { it.parentId != null }
            val label = own.firstOrNull()?.category ?: subs.first().parent ?: subs.first().category
            val ownValue = own.sumOf { it.total.toDouble() }
            val children = subs.map { FlowRow(it.category, it.total.toDouble()) } +
                if (ownValue > 0 && subs.isNotEmpty()) listOf(FlowRow("$label (other)", ownValue)) else emptyList()
            FlowRow(label, family.sumOf { it.total.toDouble() }, children)
        }

/** Where a period's money came from and where it went; null when there is neither income nor spending. */
fun moneyFlow(categories: List<CategoryTotal>, top: Int = 5): MoneyFlow? {
    val sources = biggest(rowsOf(categories, "income"), top, "Other income")
    val uses = biggest(spendingGroups(categories), top, "Other spending")
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
    // what each group was spent on, in the groups' order so no band crosses another
    uses.forEachIndexed { i, use ->
        biggest(use.children, top, "Other ${use.label}").forEachIndexed { c, child ->
            nodes += FlowNode("out:$i:$c", child.label, 3, child.value, FlowKind.Spending); links += FlowLink("out:$i", "out:$i:$c", child.value)
        }
    }
    if (income > spent) { val kept = income - spent; nodes += FlowNode("saved", "Saved", 2, kept, FlowKind.Saved); links += FlowLink("total", "saved", kept) }
    return MoneyFlow(nodes, links, income, spent)
}

data class PlacedNode(val node: FlowNode, val x: Double, val y: Double, val width: Double, val height: Double)

/** A link's centre line from the source to the target, to be stroked [thickness] wide: a curve with both control points at the middle x. */
data class PlacedLink(val link: FlowLink, val x0: Double, val y0: Double, val x1: Double, val y1: Double, val thickness: Double)

/** [seam] is where the incoming bands end and the outgoing ones begin: the middle of the (undrawn) total bar. [height] is what the nodes take. */
data class FlowLayout(val nodes: List<PlacedNode>, val links: List<PlacedLink>, val seam: Double, val height: Double)

/**
 * Where what each group was spent on starts: it fans out like a tree. A group's items are centred on their group (so they may
 * stand taller than it), then the groups' blocks are pushed apart where they would touch and back inside the diagram.
 */
fun treeTops(parents: List<String>, centers: Map<String, Double>, heights: List<Double>, gap: Double, height: Double): List<Double> {
    // the items of one parent come next to each other
    val blocks = parents.indices.groupBy { parents[it] }.values.toList()
    val sizes = blocks.map { items -> items.sumOf { heights[it] } + gap * (items.size - 1) }
    val tops = blocks.mapIndexed { b, items -> centers[parents[items.first()]]?.let { it - sizes[b] / 2 } ?: 0.0 }.toMutableList()
    var floor = 0.0
    for (b in blocks.indices) { tops[b] = maxOf(tops[b], floor); floor = tops[b] + sizes[b] + gap }
    var ceiling = height
    for (b in blocks.indices.reversed()) { tops[b] = minOf(tops[b], ceiling - sizes[b]); ceiling = tops[b] - gap }
    val out = MutableList(parents.size) { 0.0 }
    blocks.forEachIndexed { b, items ->
        var y = tops[b]
        for (i in items) { out[i] = y; y += heights[i] + gap }
    }
    return out
}

/**
 * Positions the nodes and links in a [width] by [height] box: one column per side with the total in the middle, heights in proportion to the
 * money (the same scale everywhere), each column centred vertically, links stacked along the sides of the nodes in the order of the nodes. A
 * node never gets thinner than [minHeight], so a tiny category stays visible. With [labelPitch], each labelled node has at least that much
 * room to itself, so its label can sit beside it; the diagram then grows past [height] when the labels need it.
 */
fun layoutFlow(flow: MoneyFlow, width: Double, height: Double, nodeWidth: Double = 4.0, gap: Double = 8.0, minHeight: Double = 4.0, labelPitch: Double = 0.0): FlowLayout {
    val total = flow.nodes.firstOrNull { it.kind == FlowKind.Total }?.value ?: 1.0
    val columns = (0..flow.lastColumn).map { c -> flow.nodes.filter { it.column == c } }
    val tallest = columns.maxOf { it.size }
    val scale = maxOf(0.0, height - gap * (tallest - 1)) / total
    // with a fourth column the total moves left and the last gap is shorter: it holds only thin bands
    val stops = if (flow.lastColumn == 3) listOf(0.0, 0.3, 0.76, 1.0) else listOf(0.0, 0.5, 1.0)
    val xs = stops.map { it * (width - nodeWidth) }
    val heights = columns.map { col -> col.map { maxOf(minHeight, it.value * scale) } }
    // a node's slot: its own height, or the room its label needs (the total, in column 1, has none)
    val slots = heights.mapIndexed { c, col -> if (c == 1) col else col.map { maxOf(it, labelPitch - gap) } }
    val full = maxOf(height, slots.maxOf { it.sum() + gap * maxOf(0, it.size - 1) })
    val placed = LinkedHashMap<String, PlacedNode>()
    columns.forEachIndexed { c, col ->
        var y = (full - slots[c].sum() - gap * maxOf(0, col.size - 1)) / 2
        val tops = if (c == 3) treeTops(
            col.map { n -> flow.links.first { it.target == n.id }.source },
            placed.mapValues { it.value.y + it.value.height / 2 }, slots[c], gap, full,
        ) else slots[c].map { h -> y.also { y += h + gap } }
        // the node sits in the middle of its slot
        col.forEachIndexed { i, n -> placed[n.id] = PlacedNode(n, xs[c], tops[i] + (slots[c][i] - heights[c][i]) / 2, nodeWidth, heights[c][i]) }
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
    return FlowLayout(placed.values.toList(), links, xs[1] + nodeWidth / 2, full)
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

// Reading the diagram: which part a tap lands on, the colours along a band and the readout (ported from the iOS FlowLayout+Hit/+Colors).

fun FlowLayout.node(id: String): PlacedNode? = nodes.firstOrNull { it.node.id == id }

/** Where a band is drawn from and to: incoming bands end at the seam, those leaving the total start there, a group's run bar to bar. */
fun FlowLayout.span(link: PlacedLink): Pair<Double, Double> = when {
    link.link.target == "total" -> link.x0 to seam
    link.link.source == "total" -> seam to link.x1
    else -> link.x0 to link.x1
}

/** The id of the income or spending node a band belongs to. */
fun outerNodeId(link: PlacedLink): String = if (link.link.target == "total") link.link.source else link.link.target

/** The centre line of a band at an x position: a cubic curve with both control points at the middle x. */
fun FlowLayout.bandCenterY(link: PlacedLink, x: Double): Double {
    val (start, end) = span(link)
    val middle = (start + end) / 2
    var low = 0.0
    var high = 1.0
    repeat(24) {
        val t = (low + high) / 2
        val u = 1 - t
        val curveX = u * u * u * start + 3 * u * u * t * middle + 3 * u * t * t * middle + t * t * t * end
        if (curveX < x) low = t else high = t
    }
    val t = (low + high) / 2
    val u = 1 - t
    return u * u * u * link.y0 + 3 * u * u * t * link.y0 + 3 * u * t * t * link.y1 + t * t * t * link.y1
}

/** The node a tap lands on: a bar (a generous target, since bars are thin) or anywhere along a band; null when it hits neither. */
fun FlowLayout.nodeIdAt(x: Double, y: Double, barSlop: Double = 10.0, bandSlop: Double = 6.0): String? {
    for (p in nodes) {
        if (p.node.kind == FlowKind.Total) continue
        if (x >= p.x - barSlop && x <= p.x + p.width + barSlop && y >= p.y && y <= p.y + p.height) return p.node.id
    }
    for (link in links) {
        val (start, end) = span(link)
        if (x < start || x > end) continue
        if (kotlin.math.abs(y - bandCenterY(link, x)) <= maxOf(link.thickness / 2, bandSlop)) return outerNodeId(link)
    }
    return null
}

/**
 * The kinds at the two ends of a band, so the whole flow reads as one continuous gradient. An income band is its own colour all the way to the
 * middle. A band leaving the middle starts as the colour of the income band that sits at the same height there, and ends as its destination's.
 */
fun FlowLayout.gradientKinds(link: PlacedLink): Pair<FlowKind, FlowKind> {
    if (link.link.target == "total") {
        val own = node(link.link.source)?.node?.kind ?: FlowKind.Income
        return own to own
    }
    val end = node(link.link.target)?.node?.kind ?: FlowKind.Spending
    if (link.link.source != "total") return (node(link.link.source)?.node?.kind ?: FlowKind.Spending) to end
    val incoming = links.filter { it.link.target == "total" }
    val match = incoming.firstOrNull { kotlin.math.abs(it.y1 - link.y0) <= it.thickness / 2 + 0.001 } ?: incoming.firstOrNull()
    return (match?.let { node(it.link.source)?.node?.kind } ?: FlowKind.Income) to end
}

/** "12.5%": a node's share of the total, to at most one decimal. */
fun flowShareText(value: Double, total: Double): String {
    val pct = if (total > 0) value / total * 100 else 0.0
    return java.math.BigDecimal(pct).setScale(1, java.math.RoundingMode.HALF_EVEN).stripTrailingZeros().toPlainString() + "%"
}
