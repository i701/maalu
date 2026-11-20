import Foundation

/// Positions a money flow's nodes and links in a box: one column per side with the total in the middle, heights in
/// proportion to the money (one scale everywhere), each column centred vertically and links stacked along the sides of
/// the nodes. A node never gets thinner than `minHeight`, so a tiny category stays visible.
struct FlowLayout {
    struct PlacedNode: Identifiable {
        let node: MoneyFlow.Node
        let x: Double
        let y: Double
        let width: Double
        let height: Double

        var id: String { node.id }
        var centerY: Double { y + height / 2 }
    }

    /// A link's centre line, to be stroked `thickness` wide as a curve with both control points at the middle x.
    struct PlacedLink {
        let link: MoneyFlow.Link
        let x0: Double
        let y0: Double
        let x1: Double
        let y1: Double
        let thickness: Double
    }

    let nodes: [PlacedNode]
    let links: [PlacedLink]
    /// Where the incoming bands end and the outgoing ones begin.
    let seam: Double

    func node(_ id: String) -> PlacedNode? {
        nodes.first { $0.id == id }
    }

    static func make(_ flow: MoneyFlow, width: Double, height: Double, nodeWidth: Double = 12, gap: Double = 8, minHeight: Double = 4) -> FlowLayout {
        let total = flow.nodes.first { $0.kind == .total }?.value ?? 1
        let last = flow.lastColumn
        let columns = (0...last).map { column in flow.nodes.filter { $0.column == column } }
        let tallest = columns.map(\.count).max() ?? 1
        let scale = max(0, height - gap * Double(tallest - 1)) / total
        // The total sits left of centre, so the income side is not a slab and the bands that fan out have room. With a
        // fourth column the last gap is shorter: it only holds thin bands, and the group labels need the gap before it.
        let stops: [Double] = last == 3 ? [0, 0.3, 0.76, 1] : last == 2 ? [0, 0.36, 1] : [0, 1]
        let xs = stops.map { $0 * (width - nodeWidth) }

        var placed: [String: PlacedNode] = [:]
        var ordered: [PlacedNode] = []
        for (column, nodes) in columns.enumerated() {
            let heights = nodes.map { max(minHeight, $0.value * scale) }
            var tops: [Double] = []
            if column == 3 {
                let sources = Dictionary(flow.links.map { ($0.target, $0.source) }, uniquingKeysWith: { first, _ in first })
                let parents: [String] = nodes.map { sources[$0.id] ?? "" }
                let centers: [String: Double] = placed.mapValues { $0.centerY }
                tops = Self.treeTops(parents: parents, centers: centers, heights: heights, gap: gap, height: height)
            } else {
                let gaps = gap * Double(max(0, nodes.count - 1))
                let used = heights.reduce(0, +) + gaps
                var y = (height - used) / 2
                for itemHeight in heights {
                    tops.append(y)
                    y += itemHeight + gap
                }
            }
            for (index, node) in nodes.enumerated() {
                let item = PlacedNode(node: node, x: xs[column], y: tops[index], width: nodeWidth, height: heights[index])
                placed[node.id] = item
                ordered.append(item)
            }
        }

        func span(_ id: String, outgoing: Bool) -> Double {
            flow.links.filter { (outgoing ? $0.source : $0.target) == id }.reduce(0) { $0 + $1.value * scale }
        }
        var outCursor: [String: Double] = [:]
        var inCursor: [String: Double] = [:]
        let links: [PlacedLink] = flow.links.compactMap { link in
            guard let from = placed[link.source], let to = placed[link.target] else { return nil }
            let thickness = link.value * scale
            let startTop = outCursor[from.id] ?? (from.y + (from.height - span(from.id, outgoing: true)) / 2)
            let endTop = inCursor[to.id] ?? (to.y + (to.height - span(to.id, outgoing: false)) / 2)
            outCursor[from.id] = startTop + thickness
            inCursor[to.id] = endTop + thickness
            // the total has no bar drawn, so the bands meet in the middle of its slot with no gap
            let x0 = from.node.kind == .total ? from.x + from.width / 2 : from.x + from.width
            let x1 = to.node.kind == .total ? to.x + to.width / 2 : to.x
            return PlacedLink(link: link, x0: x0, y0: startTop + thickness / 2, x1: x1, y1: endTop + thickness / 2, thickness: thickness)
        }
        return FlowLayout(nodes: ordered, links: links, seam: xs[1] + nodeWidth / 2)
    }
}
