import Foundation

/// How a month's income divides into what was spent and what was kept, as shares of the income, for the donut. Spending above the income leaves nothing kept (the figure above still shows the shortfall).
struct KeptSplit: Equatable {
    let spentShare: Double
    var keptShare: Double { 1 - spentShare }

    /// Nil when there was no income, so there is nothing to divide.
    init?(income: Decimal, spent: Decimal) {
        guard income > 0 else { return nil }
        let share = NSDecimalNumber(decimal: spent / income).doubleValue
        spentShare = min(max(share, 0), 1)
    }
}
