struct Card: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let lastDigits: String?
    let kind: CardKind
    /// A debit card's bank account, or a credit card's own account.
    let account: AccountRef
    /// Credit cards only: the bank account it is repaid from.
    let repayAccount: AccountRef?

    var label: String {
        guard let lastDigits else { return name }
        return "\(name) ·· \(lastDigits)"
    }
}
