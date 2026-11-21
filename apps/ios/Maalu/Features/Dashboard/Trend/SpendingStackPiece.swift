import Foundation

/// One category's share of one month's spending, as a piece of that month's bar.
struct SpendingStackPiece: Identifiable {
    let name: String
    /// Biggest category first: also its colour in `MeterPalette`.
    let rank: Int
    let value: Decimal

    var id: String { name }
    var amount: Double { NSDecimalNumber(decimal: value).doubleValue }
}
