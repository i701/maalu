/// A new refund (`POST /transactions`) or a change to one (`PATCH`).
struct RefundRequest: Encodable {
    /// Nil when changing a refund: its purchase never changes.
    var purchaseID: String?
    var amount: String
    var date: String
    var time: String?
    var rate: String?
    var note: String?
    var accountID: String?
    var lines: [RefundLine]?
    var isEditing: Bool

    private enum Keys: String, CodingKey {
        case type, amount, description, splits
        case refundOfId = "refund_of_id"
        case transactionDate = "transaction_date"
        case transactionTime = "transaction_time"
        case exchangeRate = "exchange_rate"
        case accountId = "account_id"
    }

    /// On a change, a blank time, note or account is sent as an explicit null so it is cleared.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        if !isEditing {
            try container.encode("income", forKey: .type)
            try container.encodeIfPresent(purchaseID, forKey: .refundOfId)
        }
        try container.encode(amount, forKey: .amount)
        try container.encode(date, forKey: .transactionDate)
        try encode(time, forKey: .transactionTime, in: &container)
        try container.encodeIfPresent(rate, forKey: .exchangeRate)
        try container.encodeIfPresent(lines, forKey: .splits)
        try encode(note, forKey: .description, in: &container)
        try encode(accountID, forKey: .accountId, in: &container)
    }

    private func encode(_ value: String?, forKey key: Keys, in container: inout KeyedEncodingContainer<Keys>) throws {
        if let value {
            try container.encode(value, forKey: key)
        } else if isEditing {
            try container.encodeNil(forKey: key)
        }
    }
}
