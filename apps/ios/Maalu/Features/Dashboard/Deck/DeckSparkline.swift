import Charts
import SwiftUI

/// A bare line in the card's ink of the net worth over the month, for a deck card.
struct DeckSparkline: View {
    let points: [BalancePoint]
    @Environment(\.deckInk) private var ink

    var body: some View {
        Chart(Array(points.enumerated()), id: \.offset) { point in
            LineMark(x: .value("Day", point.offset), y: .value("Net worth", NSDecimalNumber(decimal: Money.decimal(point.element.total) ?? 0).doubleValue))
                .interpolationMethod(.monotone)
        }
        .foregroundStyle(ink)
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(domain: .automatic(includesZero: false))
        .accessibilityHidden(true)
    }
}
