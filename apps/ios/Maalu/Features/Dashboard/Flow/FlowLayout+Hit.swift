import CoreGraphics

extension FlowLayout {
    /// The part of the flow a band covers: incoming bands run from their source to the seam, outgoing ones from the seam
    /// to their destination.
    func span(of link: PlacedLink) -> (start: Double, end: Double) {
        link.link.target == "total" ? (link.x0, seam) : (seam, link.x1)
    }

    /// The id of the income or spending node a band belongs to.
    func outerNodeID(of link: PlacedLink) -> String {
        link.link.target == "total" ? link.link.source : link.link.target
    }

    /// The node a tap lands on: a bar (a generous target, since bars are thin) or anywhere along a band.
    func nodeID(at point: CGPoint, barSlop: Double = 10, bandSlop: Double = 6) -> String? {
        for placed in nodes where placed.node.kind != .total {
            let rect = CGRect(x: placed.x - barSlop, y: placed.y, width: placed.width + barSlop * 2, height: placed.height)
            if rect.contains(point) { return placed.id }
        }
        for link in links {
            let (start, end) = span(of: link)
            guard point.x >= start, point.x <= end else { continue }
            if abs(point.y - bandCenterY(link, atX: point.x)) <= max(link.thickness / 2, bandSlop) {
                return outerNodeID(of: link)
            }
        }
        return nil
    }

    /// The centre line of a band at an x position: a cubic curve with both control points at the middle x.
    func bandCenterY(_ link: PlacedLink, atX x: Double) -> Double {
        let (start, end) = span(of: link)
        let middle = (start + end) / 2
        var low = 0.0
        var high = 1.0
        for _ in 0..<24 {
            let t = (low + high) / 2
            let u = 1 - t
            let curveX = u * u * u * start + 3 * u * u * t * middle + 3 * u * t * t * middle + t * t * t * end
            if curveX < x { low = t } else { high = t }
        }
        let t = (low + high) / 2
        let u = 1 - t
        return u * u * u * link.y0 + 3 * u * u * t * link.y0 + 3 * u * t * t * link.y1 + t * t * t * link.y1
    }
}
