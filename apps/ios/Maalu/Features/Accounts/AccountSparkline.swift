import Charts
import SwiftUI

struct AccountSparkline: View {
    let values: [Double]

    private var change: Double { (values.last ?? 0) - (values.first ?? 0) }

    private var direction: LocalizedStringResource { change > 0 ? "up" : change < 0 ? "down" : "flat" }

    var body: some View {
        Chart(Array(values.enumerated()), id: \.offset) { day in
            LineMark(x: .value("Day", day.offset), y: .value("Balance", day.element))
        }
        .foregroundStyle(change > 0 ? Color.green : change < 0 ? Color.red : Color.secondary)
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(domain: .automatic(includesZero: false))
        .frame(width: 64, height: 22)
        .accessibilityLabel("Balance over 30 days: \(direction)")
    }
}
