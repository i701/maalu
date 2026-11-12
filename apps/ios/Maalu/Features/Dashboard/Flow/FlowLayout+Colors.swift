import SwiftUI

extension FlowLayout {
    /// The colour at one end of a band, so the whole flow reads as one continuous gradient. An income band is its own
    /// colour all the way to the middle. A band leaving the middle starts as the colour of the income band that sits at
    /// the same height there, and ends as its own destination's colour.
    func nodeColor(of link: PlacedLink, incoming: Bool, start: Bool) -> Color {
        if incoming {
            return Color(flow: node(link.link.source)?.node.kind ?? .income)
        }
        if !start {
            return Color(flow: node(link.link.target)?.node.kind ?? .spending)
        }
        let incomingLinks = links.filter { $0.link.target == "total" }
        let match = incomingLinks.first { abs($0.y1 - link.y0) <= $0.thickness / 2 + 0.001 } ?? incomingLinks.first
        return Color(flow: match.flatMap { node($0.link.source)?.node.kind } ?? .income)
    }
}
