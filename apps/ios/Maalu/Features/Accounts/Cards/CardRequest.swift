struct CardRequest: Encodable {
    let name: String
    let lastDigits: String?
    let repayAccountId: String?
    /// Only when adding one: the account decides the kind, and a card stays on its account.
    let kind: String?
    let accountId: String?

    private enum Keys: String, CodingKey {
        case name, kind
        case lastDigits = "last_digits"
        case repayAccountId = "repay_account_id"
        case accountId = "account_id"
    }

    /// Writes an empty last four or repayment account as null, which clears it on a change.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(name, forKey: .name)
        try container.encode(lastDigits, forKey: .lastDigits)
        try container.encode(repayAccountId, forKey: .repayAccountId)
        try container.encodeIfPresent(kind, forKey: .kind)
        try container.encodeIfPresent(accountId, forKey: .accountId)
    }
}
