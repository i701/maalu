import Charts
import SwiftUI

/// A small bar chart for the space beside a donut and its legend: bars with a one-letter label under each, the highlighted one solid and the others faded, in the ink of the section around it. The layout follows a reference analytics screen.
struct DeckMiniBars: View {
    let bars: [MiniBar]
    @Environment(\.deckInk) private var ink

    var body: some View {
        Chart(bars) { bar in
            BarMark(x: .value("Label", bar.label), y: .value("Value", bar.value), width: .ratio(0.6))
                .foregroundStyle(ink.opacity(bar.isHighlighted ? 1 : 0.28))
                .cornerRadius(3)
        }
        .chartYAxis(.hidden)
        .chartXAxis {
            AxisMarks { _ in
                AxisValueLabel().font(.caption2).foregroundStyle(ink.opacity(0.7))
            }
        }
        .chartYScale(domain: .automatic(includesZero: true))
        .accessibilityHidden(true)
    }
}
