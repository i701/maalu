import SwiftUI

extension FlowLayout {
    /// A band as a filled ribbon between two Bézier edges, so its thickness stays the same all along it. A thick stroked
    /// line pinches where it bends steeply. Both control points sit at the middle x, which eases the band out of one bar
    /// and into the next.
    func ribbon(for link: PlacedLink) -> Path {
        let (startX, endX) = span(of: link)
        let middle = (startX + endX) / 2
        let half = link.thickness / 2
        let topStart = link.y0 - half, topEnd = link.y1 - half
        let bottomStart = link.y0 + half, bottomEnd = link.y1 + half

        var path = Path()
        path.move(to: CGPoint(x: startX, y: topStart))
        path.addCurve(to: CGPoint(x: endX, y: topEnd), control1: CGPoint(x: middle, y: topStart), control2: CGPoint(x: middle, y: topEnd))
        path.addLine(to: CGPoint(x: endX, y: bottomEnd))
        path.addCurve(to: CGPoint(x: startX, y: bottomStart), control1: CGPoint(x: middle, y: bottomEnd), control2: CGPoint(x: middle, y: bottomStart))
        path.closeSubpath()
        return path
    }
}
