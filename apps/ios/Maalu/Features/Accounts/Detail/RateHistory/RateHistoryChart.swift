import Charts
import SwiftUI

struct RateHistoryChart: View {
    let points: [RatePoint]

    var body: some View {
        Chart(points) { point in
            if let day = ISODate.date(point.date), let rate = Money.decimal(point.rate) {
                LineMark(x: .value("Date", day), y: .value("Rate", NSDecimalNumber(decimal: rate).doubleValue))
            }
        }
        .chartYScale(domain: .automatic(includesZero: false))
        .chartXAxis { AxisMarks(values: .automatic(desiredCount: 4)) }
        .frame(height: 200)
        .accessibilityLabel("Market rate over time")
    }
}
