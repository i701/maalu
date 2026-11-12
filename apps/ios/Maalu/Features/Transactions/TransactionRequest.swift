struct TransactionRequest: Encodable {
    var type: TransactionType
    var amount: String
    var transactionDate: String
    var accountId: String?
    var toAccountId: String?
    var toAmount: String?
    var category: String?
    var vendorName: String?
    var description: String?
    var paymentMethod: PaymentMethod?
    var currency: String?
    var exchangeRate: String?
    var planned: Bool?
    /// On an edit, a blank vendor or note has to be sent as an explicit null to clear it.
    var clearsVendor = false
    var clearsDescription = false

    private enum Keys: String, CodingKey {
        case type, amount, category, currency, planned, description
        case transactionDate = "transaction_date"
        case accountId = "account_id"
        case toAccountId = "to_account_id"
        case toAmount = "to_amount"
        case vendorName = "vendor_name"
        case vendorId = "vendor_id"
        case paymentMethod = "payment_method"
        case exchangeRate = "exchange_rate"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(type, forKey: .type)
        try container.encode(amount, forKey: .amount)
        try container.encode(transactionDate, forKey: .transactionDate)
        try container.encodeIfPresent(accountId, forKey: .accountId)
        try container.encodeIfPresent(toAccountId, forKey: .toAccountId)
        try container.encodeIfPresent(toAmount, forKey: .toAmount)
        try container.encodeIfPresent(category, forKey: .category)
        try container.encodeIfPresent(paymentMethod, forKey: .paymentMethod)
        try container.encodeIfPresent(currency, forKey: .currency)
        try container.encodeIfPresent(exchangeRate, forKey: .exchangeRate)
        try container.encodeIfPresent(planned, forKey: .planned)
        if let vendorName {
            try container.encode(vendorName, forKey: .vendorName)
        } else if clearsVendor {
            try container.encodeNil(forKey: .vendorId)
        }
        if let description {
            try container.encode(description, forKey: .description)
        } else if clearsDescription {
            try container.encodeNil(forKey: .description)
        }
    }
}
