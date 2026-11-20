/// One item given back, as the API wants it: it names the item (and takes its category from it).
struct RefundLine: Encodable {
    let name: String
    let quantity = "1"
    let category: String
    let amount: String
    let refundOfSplitId: String

    private enum Keys: String, CodingKey {
        case name, quantity, category, amount
        case refundOfSplitId = "refund_of_split_id"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(name, forKey: .name)
        try container.encode(quantity, forKey: .quantity)
        try container.encode(category, forKey: .category)
        try container.encode(amount, forKey: .amount)
        try container.encode(refundOfSplitId, forKey: .refundOfSplitId)
    }

    static func lines(_ items: [RefundItem]) -> [RefundLine] {
        items.filter(\.isOn).map {
            RefundLine(name: $0.name, category: $0.category, amount: Money.string($0.amount ?? 0), refundOfSplitId: $0.id)
        }
    }
}
