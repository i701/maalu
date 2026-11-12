import Charts
import SwiftUI

/// Two bars per category on one scale: what it was before in a muted tone and what it is now in
/// the series colour, so the gap between them is the change.
struct CompareChart: View {
    let rows: [CompareRow]

    var body: some View {
        Chart(rows) { row in
            BarMark(x: .value("Amount", row.change.now.doubleValue), y: .value("Category", row.name))
                .foregroundStyle(by: .value("Period", String(localized: "Now")))
            BarMark(x: .value("Amount", row.change.before.doubleValue), y: .value("Category", row.name))
                .foregroundStyle(by: .value("Period", String(localized: "Before")))
        }
        .chartForegroundStyleScale([
            String(localized: "Now"): Color.orange,
            String(localized: "Before"): Color.gray,
        ])
        .chartLegend(position: .top)
        .frame(height: max(180, CGFloat(rows.count) * 44))
        .accessibilityLabel("Spending by category, now against before")
    }
}

private extension Decimal {
    var doubleValue: Double { NSDecimalNumber(decimal: self).doubleValue }
}
