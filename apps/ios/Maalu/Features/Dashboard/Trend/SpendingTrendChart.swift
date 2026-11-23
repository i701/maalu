import Charts
import SwiftUI

/// The bars: a column per month stacked by category on a hairline baseline, with no axes. Press and drag along them to pick a month; a month or a category held lights up and the rest fall back.
struct SpendingTrendChart: View {
    let stack: SpendingStack
    @Binding var selectedDate: Date?
    let held: String?
    @State private var isShown = false

    var body: some View {
        let picked = selectedDate.flatMap { stack.month(containing: $0) }
        let gap = stack.tallest * 0.012
        let grown = isShown ? 1.0 : 0
        Chart {
            ForEach(stack.months) { month in
                ForEach(month.layers(gap: gap)) { layer in
                    BarMark(x: .value("Month", month.start, unit: .month), yStart: .value("From", layer.start * grown), yEnd: .value("To", layer.end * grown), width: .ratio(0.62))
                        .foregroundStyle(by: .value("Category", layer.piece.name))
                        .cornerRadius(3)
                        .opacity(isLit(month, layer.piece, picked: picked) ? 1 : 0.25)
                }
            }
            RuleMark(y: .value("Baseline", 0))
                .lineStyle(StrokeStyle(lineWidth: 1))
                .foregroundStyle(Color.primary.opacity(0.12))
        }
        .chartForegroundStyleScale(domain: stack.names, range: stack.names.indices.map { stack.color(at: $0) })
        .chartLegend(.hidden)
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartXSelection(value: $selectedDate)
        .frame(height: 140)
        .revealOnAppear($isShown)
        .accessibilityHidden(true)
    }

    /// Lit when it is the month picked (or none is) and the category held (or none is).
    private func isLit(_ month: SpendingStackMonth, _ piece: SpendingStackPiece, picked: SpendingStackMonth?) -> Bool {
        (picked == nil || picked?.id == month.id) && (held == nil || held == piece.name)
    }
}
