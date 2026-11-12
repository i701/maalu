import Foundation

/// How a figure moved between the two periods, exactly.
struct CompareChange: Equatable {
    let before: Decimal
    let now: Decimal

    /// Now less before.
    var change: Decimal { now - before }

    /// How much it moved as a share of before; nil when before was nothing to compare with.
    var percent: Double? {
        guard before > 0 else { return nil }
        return NSDecimalNumber(decimal: (now - before) / before * 100).doubleValue
    }

    /// The share rounded for display, or nil when there was nothing to compare with.
    var percentText: String? {
        percent.map { "\(Int(abs($0).rounded()))%" }
    }
}
