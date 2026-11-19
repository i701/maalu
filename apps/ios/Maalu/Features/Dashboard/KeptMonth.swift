import Foundation

/// One month of the cash flow with what was kept that month and the running total of it from the first month shown.
struct KeptMonth: Identifiable {
    let point: MonthlyPoint
    let running: Decimal

    var id: String { point.id }
    var kept: Decimal { point.kept }

    /// Added exactly in `Decimal`; the charts get `Double`s only to draw.
    static func months(from points: some Sequence<MonthlyPoint>) -> [KeptMonth] {
        var running: Decimal = 0
        return points.map { point in
            running += point.kept
            return KeptMonth(point: point, running: running)
        }
    }
}
