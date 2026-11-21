import Foundation

/// Income and expense per category for each calendar month, in the base currency: the category totals split by month.
struct CategoryMonths: Decodable {
    static let empty = CategoryMonths(currency: "", months: [], categories: [])

    let currency: String
    /// Every month in the range, oldest first, as `2026-03`.
    let months: [String]
    let categories: [CategoryMonthRow]
}

struct CategoryMonthRow: Decodable, Identifiable {
    let categoryId: String
    let category: String
    let color: String
    let type: String
    let parent: String?
    /// One for each month, zero where nothing happened.
    let amounts: [String]
    let total: String

    var id: String { categoryId }
    var values: [Decimal] { amounts.map { Money.decimal($0) ?? 0 } }
    var totalValue: Decimal { Money.decimal(total) ?? 0 }

    func value(at month: Int) -> Decimal {
        amounts.indices.contains(month) ? Money.decimal(amounts[month]) ?? 0 : 0
    }
}
