import Foundation

/// How this month's spending moved against last month's, in whole percent (negative is down).
struct SpendingChange {
    let percent: Int

    /// Nil when there was nothing last month to compare with.
    init?(current: Decimal, previous: Decimal?) {
        guard let previous, let change = PercentChange.between(current, previous) else { return nil }
        percent = Int(change.rounded())
    }

    var text: String {
        if percent == 0 { return String(localized: "Same as last month") }
        return percent > 0 ? String(localized: "Up \(percent)% on last month") : String(localized: "Down \(-percent)% on last month")
    }

    var symbol: String {
        percent > 0 ? "arrow.up.right" : percent < 0 ? "arrow.down.right" : "equal"
    }

    /// Spending less is good news.
    var isGood: Bool { percent <= 0 }
}
