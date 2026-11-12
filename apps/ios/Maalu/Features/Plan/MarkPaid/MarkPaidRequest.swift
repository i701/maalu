struct MarkPaidRequest: Encodable {
    var transactionDate: String
    var amount: String?
    var exchangeRate: String?
    var baseAmount: String?

    private enum Keys: String, CodingKey {
        case transactionDate = "transaction_date"
        case transactionTime = "transaction_time"
        case amount
        case exchangeRate = "exchange_rate"
        case baseAmount = "base_amount"
    }

    /// The planned time is dropped: it was a guess, and the real one is not asked for.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(transactionDate, forKey: .transactionDate)
        try container.encodeNil(forKey: .transactionTime)
        try container.encodeIfPresent(amount, forKey: .amount)
        try container.encodeIfPresent(exchangeRate, forKey: .exchangeRate)
        try container.encodeIfPresent(baseAmount, forKey: .baseAmount)
    }
}
