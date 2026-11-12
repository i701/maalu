struct AccountRequest: Encodable {
    var group: AccountGroup?
    var name: String?
    var currency: String?
    var exchangeRate: String?
    var autoRate: Bool?
    var openingAmount: String?
    var bank: String?
    var accountNumber: String?
    var description: String?
    var creditLimit: String?
    var statementDay: Int?
    var dueDay: Int?
    var excludeFromStats: Bool?
    var spendable: Bool?
    /// Fields cleared on an edit are sent as an explicit null; leaving a field out keeps it.
    private(set) var clears: Set<Key> = []

    enum Key: String, CodingKey, Hashable {
        case group, name, currency, bank, description, spendable
        case exchangeRate = "exchange_rate"
        case autoRate = "auto_rate"
        case openingAmount = "opening_amount"
        case accountNumber = "account_number"
        case creditLimit = "credit_limit"
        case statementDay = "statement_day"
        case dueDay = "due_day"
        case excludeFromStats = "exclude_from_stats"
    }

    mutating func clear(_ keys: Key...) {
        clears.formUnion(keys)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Key.self)
        try container.encodeIfPresent(group, forKey: .group)
        try container.encodeIfPresent(name, forKey: .name)
        try container.encodeIfPresent(currency, forKey: .currency)
        try container.encodeIfPresent(exchangeRate, forKey: .exchangeRate)
        try container.encodeIfPresent(autoRate, forKey: .autoRate)
        try container.encodeIfPresent(openingAmount, forKey: .openingAmount)
        try container.encodeIfPresent(excludeFromStats, forKey: .excludeFromStats)
        try encode(bank, key: .bank, in: &container)
        try encode(accountNumber, key: .accountNumber, in: &container)
        try encode(description, key: .description, in: &container)
        try encode(creditLimit, key: .creditLimit, in: &container)
        try encode(statementDay, key: .statementDay, in: &container)
        try encode(dueDay, key: .dueDay, in: &container)
        try encode(spendable, key: .spendable, in: &container)
    }

    private func encode<T: Encodable>(_ value: T?, key: Key, in container: inout KeyedEncodingContainer<Key>) throws {
        if let value {
            try container.encode(value, forKey: key)
        } else if clears.contains(key) {
            try container.encodeNil(forKey: key)
        }
    }
}
