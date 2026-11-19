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
    var transactionTime: String?
    var tags: [String]?
    var cardId: String?
    var location: TransactionLocation?
    /// On an edit, a blank vendor, note, time or card has to be sent as an explicit null to clear it.
    var clearsVendor = false
    var clearsDescription = false
    var clearsTime = false
    var clearsCard = false
    var clearsLocation = false

    private enum Keys: String, CodingKey {
        case type, amount, category, currency, planned, description, tags
        case transactionDate = "transaction_date"
        case transactionTime = "transaction_time"
        case cardId = "card_id"
        case accountId = "account_id"
        case toAccountId = "to_account_id"
        case toAmount = "to_amount"
        case vendorName = "vendor_name"
        case vendorId = "vendor_id"
        case paymentMethod = "payment_method"
        case exchangeRate = "exchange_rate"
        case latitude, longitude, place
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
        try container.encodeIfPresent(tags, forKey: .tags)
        if let transactionTime {
            try container.encode(transactionTime, forKey: .transactionTime)
        } else if clearsTime {
            try container.encodeNil(forKey: .transactionTime)
        }
        if let cardId {
            try container.encode(cardId, forKey: .cardId)
        } else if clearsCard {
            try container.encodeNil(forKey: .cardId)
        }
        if let vendorName {
            try container.encode(vendorName, forKey: .vendorName)
        } else if clearsVendor {
            try container.encodeNil(forKey: .vendorId)
        }
        if let location {
            // all three together, so a name taken off on an edit goes too
            let name = location.place.trimmingCharacters(in: .whitespaces)
            try container.encode(location.latitude, forKey: .latitude)
            try container.encode(location.longitude, forKey: .longitude)
            try container.encode(name.isEmpty ? nil : name, forKey: .place)
        } else if clearsLocation {
            try container.encodeNil(forKey: .latitude)
            try container.encodeNil(forKey: .longitude)
            try container.encodeNil(forKey: .place)
        }
        if let description {
            try container.encode(description, forKey: .description)
        } else if clearsDescription {
            try container.encodeNil(forKey: .description)
        }
    }
}
