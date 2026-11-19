import Charts
import SwiftUI

/// What was kept each month: up from zero when income beat spending, down when it did not.
struct KeptChart: View {
    let months: [KeptMonth]

    private static let kept = "Kept"
    private static let overspent = "Overspent"

    var body: some View {
        Chart {
            ForEach(months) { month in
                if let start = month.point.start {
                    BarMark(x: .value("Month", start, unit: .month), y: .value("Kept", NSDecimalNumber(decimal: month.kept).doubleValue))
                        .foregroundStyle(by: .value("Type", month.kept < 0 ? Self.overspent : Self.kept))
                }
            }
            RuleMark(y: .value("Zero", 0))
                .foregroundStyle(.secondary)
        }
        .chartForegroundStyleScale([Self.kept: Color.blue, Self.overspent: Color.red])
        .chartXAxis {
            AxisMarks(values: .stride(by: .month, count: months.count > 6 ? 2 : 1)) { _ in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.month(.abbreviated))
            }
        }
        .frame(height: 160)
        .accessibilityLabel("Kept each month")
    }
}
