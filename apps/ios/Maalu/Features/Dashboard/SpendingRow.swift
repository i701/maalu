import Foundation

struct SpendingRow: Identifiable {
    let name: String
    let total: Decimal
    let share: Double
    let color: String?

    var id: String { name }

    /// The biggest expense categories, the rest folded into one "Other" row. Empty when nothing was spent.
    static func rows(from categories: [CategoryTotal], top: Int = 6) -> [SpendingRow] {
        let expenses = categories
            .filter { $0.isExpense && $0.value > 0 }
            .sorted { $0.value > $1.value }
        let sum = expenses.reduce(Decimal.zero) { $0 + $1.value }
        guard sum > 0 else { return [] }

        func share(_ amount: Decimal) -> Double { NSDecimalNumber(decimal: amount / sum).doubleValue }
        var rows = expenses.prefix(top).map { SpendingRow(name: $0.category, total: $0.value, share: share($0.value), color: $0.color) }
        let rest = expenses.dropFirst(top).reduce(Decimal.zero) { $0 + $1.value }
        if rest > 0 {
            rows.append(SpendingRow(name: String(localized: "Other"), total: rest, share: share(rest), color: nil))
        }
        return rows
    }
}
