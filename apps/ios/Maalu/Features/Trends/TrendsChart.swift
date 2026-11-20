import Charts
import SwiftUI

/// The same data as stacked columns: one column per month, the biggest categories at the bottom and the rest folded into a grey "Other".
struct TrendsChart: View {
    let months: [String]
    let series: [TrendSeries]

    private static let palette = ["blue", "green", "orange", "violet", "pink", "amber", "lime"]

    var body: some View {
        let accents = TrendStack.distinctAccents(series, palette: Self.palette)
        Chart {
            ForEach(series) { item in
                ForEach(Array(months.enumerated()), id: \.offset) { index, month in
                    if let start = ISODate.date("\(month)-01") {
                        BarMark(x: .value("Month", start, unit: .month), y: .value("Amount", item.value(at: index).doubleValue))
                            .foregroundStyle(by: .value("Category", item.name))
                    }
                }
            }
        }
        .chartForegroundStyleScale(domain: series.map(\.name), range: accents.map { Color(accent: $0) })
        .chartXAxis {
            AxisMarks(values: .stride(by: .month, count: months.count > 12 ? 3 : months.count > 6 ? 2 : 1)) { _ in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.month(.abbreviated))
            }
        }
        .frame(height: 280)
        .accessibilityLabel("Category by month, stacked columns")
    }
}

private extension Decimal {
    var doubleValue: Double { NSDecimalNumber(decimal: self).doubleValue }
}
