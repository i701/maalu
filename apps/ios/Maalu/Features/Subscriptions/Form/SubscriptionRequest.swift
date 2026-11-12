struct SubscriptionRequest: Encodable {
    var name: String?
    var amount: String?
    var currency: String?
    var exchangeRate: String?
    var accountId: String?
    var vendorName: String?
    var category: String?
    var paymentMethod: PaymentMethod?
    var intervalUnit: IntervalUnit?
    var intervalCount: Int?
    var startDate: String?
    var status: SubscriptionStatus?
    var installmentsTotal: Int?
    var remindDaysBefore: Int?
    var amountVaries: Bool?
    /// Fields cleared are sent as an explicit null; leaving a field out keeps it (or, on create, uses the default).
    private(set) var clears: Set<Key> = []

    enum Key: String, CodingKey, Hashable {
        case name, amount, currency, category, status
        case exchangeRate = "exchange_rate"
        case accountId = "account_id"
        case vendorName = "vendor_name"
        case paymentMethod = "payment_method"
        case intervalUnit = "interval_unit"
        case intervalCount = "interval_count"
        case startDate = "start_date"
        case installmentsTotal = "installments_total"
        case remindDaysBefore = "remind_days_before"
        case amountVaries = "amount_varies"
    }

    mutating func clear(_ keys: Key...) {
        clears.formUnion(keys)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Key.self)
        try container.encodeIfPresent(name, forKey: .name)
        try container.encodeIfPresent(amount, forKey: .amount)
        try container.encodeIfPresent(currency, forKey: .currency)
        try container.encodeIfPresent(exchangeRate, forKey: .exchangeRate)
        try container.encodeIfPresent(category, forKey: .category)
        try container.encodeIfPresent(paymentMethod, forKey: .paymentMethod)
        try container.encodeIfPresent(intervalUnit, forKey: .intervalUnit)
        try container.encodeIfPresent(intervalCount, forKey: .intervalCount)
        try container.encodeIfPresent(startDate, forKey: .startDate)
        try container.encodeIfPresent(status, forKey: .status)
        try container.encodeIfPresent(amountVaries, forKey: .amountVaries)
        try encode(accountId, key: .accountId, in: &container)
        try encode(vendorName, key: .vendorName, in: &container)
        try encode(installmentsTotal, key: .installmentsTotal, in: &container)
        try encode(remindDaysBefore, key: .remindDaysBefore, in: &container)
    }

    private func encode<T: Encodable>(_ value: T?, key: Key, in container: inout KeyedEncodingContainer<Key>) throws {
        if let value {
            try container.encode(value, forKey: key)
        } else if clears.contains(key) {
            try container.encodeNil(forKey: key)
        }
    }
}
