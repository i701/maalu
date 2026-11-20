import Foundation

/// The start, end, range and movement (in percent) of a series of rates.
struct RateSummary {
    let first: Decimal
    let last: Decimal
    let low: Decimal
    let high: Decimal
    let change: Decimal

    /// Nil with no readable points. `points` run oldest first.
    init?(_ points: [RatePoint]) {
        let values = points.compactMap { Money.decimal($0.rate) }
        guard let first = values.first, let last = values.last, let low = values.min(), let high = values.max() else { return nil }
        self.first = first
        self.last = last
        self.low = low
        self.high = high
        change = first == 0 ? 0 : (last - first) / first * 100
    }

    /// A rate without needless zeros, but with the four decimals a currency like the rufiyaa needs.
    static func text(_ rate: Decimal) -> String {
        rate.formatted(.number.precision(.fractionLength(0...4)))
    }
}
