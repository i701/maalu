import Charts
import SwiftUI

struct NetWorthChart: View {
    let points: [BalancePoint]

    private var lowest: Double { points.map(\.value).min() ?? 0 }

    var body: some View {
        Chart(points) { point in
            if let day = point.day {
                AreaMark(x: .value("Date", day), yStart: .value("Lowest", lowest), yEnd: .value("Net worth", point.value))
                    .foregroundStyle(.tint.opacity(0.15))
                LineMark(x: .value("Date", day), y: .value("Net worth", point.value))
            }
        }
        .chartYScale(domain: .automatic(includesZero: false))
        .frame(height: 160)
        .chartXAxis { AxisMarks(values: .automatic(desiredCount: 4)) }
        .accessibilityLabel("Net worth over the month")
    }
}
