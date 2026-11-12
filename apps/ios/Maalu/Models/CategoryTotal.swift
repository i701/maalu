import Foundation

struct CategoryTotal: Decodable, Identifiable {
    let categoryId: String
    let category: String
    let color: String
    let total: String
    let type: String
    let kind: String?

    var id: String { categoryId }
    var value: Decimal { Money.decimal(total) ?? 0 }
    var isExpense: Bool { type == "expense" }
}
