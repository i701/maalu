import Foundation

enum PercentChange {
    /// How much `current` moved against `previous`, in percent; nil when there was nothing to compare with.
    static func between(_ current: Decimal, _ previous: Decimal) -> Double? {
        guard previous > 0 else { return nil }
        return NSDecimalNumber(decimal: (current - previous) * 100 / previous).doubleValue
    }
}
