import Charts
import SwiftUI

struct AccountBalanceChart: View {
    let points: [AccountBalancePoint]

    private var lowest: Double { points.map(\.value).min() ?? 0 }

    var body: some View {
        Chart(points) { point in
            if let day = point.day {
                AreaMark(x: .value("Date", day), yStart: .value("Lowest", lowest), yEnd: .value("Balance", point.value))
                    .foregroundStyle(.tint.opacity(0.15))
                LineMark(x: .value("Date", day), y: .value("Balance", point.value))
            }
        }
        .chartYScale(domain: .automatic(includesZero: false))
        .chartXAxis { AxisMarks(values: .automatic(desiredCount: 4)) }
        .frame(height: 160)
        .accessibilityLabel("Balance over time")
    }
}
