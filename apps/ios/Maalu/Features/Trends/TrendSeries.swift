import Foundation

/// One category's stack in the column chart.
struct TrendSeries: Identifiable, Equatable {
    let name: String
    /// A category's accent name, or nil for the folded-together "Other".
    let color: String?
    /// One per month, never below zero: a refund-heavy month has nothing to stack.
    let values: [Decimal]

    var id: String { name }

    func value(at month: Int) -> Decimal {
        values.indices.contains(month) ? values[month] : 0
    }
}
