import Foundation

struct CategoryTotal: Decodable, Identifiable {
    let categoryId: String
    let category: String
    let color: String
    let total: String
    let type: String
    let kind: String?
    let parent: String?

    init(categoryId: String, category: String, color: String, total: String, type: String, kind: String? = nil, parent: String? = nil) {
        self.categoryId = categoryId
        self.category = category
        self.color = color
        self.total = total
        self.type = type
        self.kind = kind
        self.parent = parent
    }

    var id: String { categoryId }
    var value: Decimal { Money.decimal(total) ?? 0 }
    var isExpense: Bool { type == "expense" }
}
