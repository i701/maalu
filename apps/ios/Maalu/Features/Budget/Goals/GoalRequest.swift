struct GoalRequest: Encodable {
    var name: String?
    var targetAmount: String?
    var accountId: String?
    var monthlyAmount: String?
    var targetDate: String?
    var clearsAccount = false
    var clearsMonthly = false
    var clearsDate = false

    private enum Keys: String, CodingKey {
        case name
        case targetAmount = "target_amount"
        case accountId = "account_id"
        case monthlyAmount = "monthly_amount"
        case targetDate = "target_date"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encodeIfPresent(name, forKey: .name)
        try container.encodeIfPresent(targetAmount, forKey: .targetAmount)
        try encode(accountId, clears: clearsAccount, key: .accountId, in: &container)
        try encode(monthlyAmount, clears: clearsMonthly, key: .monthlyAmount, in: &container)
        try encode(targetDate, clears: clearsDate, key: .targetDate, in: &container)
    }

    /// A value is sent when there is one; an explicit null only when the field was cleared on an edit.
    private func encode(_ value: String?, clears: Bool, key: Keys, in container: inout KeyedEncodingContainer<Keys>) throws {
        if let value {
            try container.encode(value, forKey: key)
        } else if clears {
            try container.encodeNil(forKey: key)
        }
    }
}
