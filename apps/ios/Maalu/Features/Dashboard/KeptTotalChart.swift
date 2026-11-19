import Charts
import SwiftUI

struct KeptTotalChart: View {
    let months: [KeptMonth]

    var body: some View {
        Chart {
            ForEach(months) { month in
                if let start = month.point.start {
                    LineMark(x: .value("Month", start, unit: .month), y: .value("Kept in total", NSDecimalNumber(decimal: month.running).doubleValue))
                    PointMark(x: .value("Month", start, unit: .month), y: .value("Kept in total", NSDecimalNumber(decimal: month.running).doubleValue))
                }
            }
            RuleMark(y: .value("Zero", 0))
                .foregroundStyle(.secondary)
        }
        .chartXAxis {
            AxisMarks(values: .stride(by: .month, count: months.count > 6 ? 2 : 1)) { _ in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.month(.abbreviated))
            }
        }
        .frame(height: 160)
        .accessibilityLabel("Kept in total")
    }
}
