import Charts
import SwiftUI

/// What moved net worth, step by step: each bar starts where the one before ended, from zero to the total change.
struct NetWorthWaterfall: View {
    let bars: [NetWorthBar]

    var body: some View {
        Chart(bars) { bar in
            BarMark(
                x: .value("Driver", bar.title),
                yStart: .value("From", NSDecimalNumber(decimal: bar.low).doubleValue),
                yEnd: .value("To", NSDecimalNumber(decimal: bar.high).doubleValue)
            )
            .foregroundStyle(color(of: bar))
            RuleMark(y: .value("Zero", 0))
                .foregroundStyle(.secondary)
        }
        .chartXAxis {
            AxisMarks { _ in
                AxisValueLabel(collisionResolution: .greedy, orientation: .verticalReversed)
            }
        }
        .frame(height: 240)
        .accessibilityLabel("What moved net worth, step by step")
    }

    private func color(of bar: NetWorthBar) -> Color {
        if bar.isTotal { return .blue }
        return bar.value > 0 ? .green : .red
    }
}
