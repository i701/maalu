struct SplitRequest: Encodable, Equatable {
    let name: String
    let quantity: String
    let category: String
    /// The line total, tax included.
    let amount: String
    let taxAmount: String?

    private enum Keys: String, CodingKey {
        case name, quantity, category, amount
        case taxAmount = "tax_amount"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(name, forKey: .name)
        try container.encode(quantity, forKey: .quantity)
        try container.encode(category, forKey: .category)
        try container.encode(amount, forKey: .amount)
        try container.encode(taxAmount, forKey: .taxAmount)
    }
}
