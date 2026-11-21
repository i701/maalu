import SwiftUI

/// One bar cut into a piece per category, each as wide as its share, round at the two ends and nearly square where pieces meet. Press or drag along it and the piece under the finger holds while the rest fall back.
struct SpendingMeterBar: View {
    let rows: [SpendingRow]
    @Binding var hot: SpendingRow.ID?

    private static let gap: CGFloat = 3
    private static let outer: CGFloat = 6
    private static let inner: CGFloat = 2

    var body: some View {
        GeometryReader { proxy in
            let widths = widths(in: proxy.size.width)
            HStack(spacing: Self.gap) {
                ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                    UnevenRoundedRectangle(cornerRadii: radii(at: index), style: .continuous)
                        .fill(MeterPalette.color(rank: index, isRemainder: row.isOther))
                        .frame(width: widths[index])
                        .opacity(hot != nil && hot != row.id ? 0.22 : 1)
                }
            }
            .contentShape(.rect)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { scrub(at: $0.location.x, widths: widths) }
                    .onEnded { _ in hot = nil }
            )
        }
        .frame(height: 40)
        .accessibilityHidden(true)
    }

    /// Each piece as wide as its share of what is left after the gaps, never thinner than a dot.
    private func widths(in width: CGFloat) -> [CGFloat] {
        let room = max(0, width - Self.gap * CGFloat(max(rows.count - 1, 0)))
        return rows.map { max(3, room * $0.share) }
    }

    private func radii(at index: Int) -> RectangleCornerRadii {
        let first = index == 0
        let last = index == rows.count - 1
        return RectangleCornerRadii(
            topLeading: first ? Self.outer : Self.inner,
            bottomLeading: first ? Self.outer : Self.inner,
            bottomTrailing: last ? Self.outer : Self.inner,
            topTrailing: last ? Self.outer : Self.inner
        )
    }

    private func scrub(at x: CGFloat, widths: [CGFloat]) {
        var edge: CGFloat = 0
        for (index, width) in widths.enumerated() {
            edge += width + Self.gap
            if x < edge {
                hot = rows[index].id
                return
            }
        }
        hot = rows.last?.id
    }
}
