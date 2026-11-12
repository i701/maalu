import Foundation

/// The body for `POST /templates`: the form as it stands, with a name. Left-empty fields are left
/// out so the template does not fill them, and the rate is deliberately not stored.
struct TemplateRequest: Encodable {
    var name: String
    var type: TransactionType
    var amount: String?
    var paymentMethod: PaymentMethod
    var category: String?
    var vendorName: String?
    var description: String?
    var accountId: String?
    var toAccountId: String?

    init(draft: TransactionDraft, accounts: [Account], name: String) {
        let from = accounts.first { $0.id == draft.accountID }
        let to = accounts.first { $0.id == draft.toAccountID }
        self.name = name.trimmingCharacters(in: .whitespaces)
        type = draft.type
        amount = (draft.amount ?? 0) > 0 ? draft.amount.map { Money.string($0) } : nil
        paymentMethod = draft.method
        category = nil
        vendorName = nil
        let note = draft.note.trimmingCharacters(in: .whitespacesAndNewlines)
        description = note.isEmpty ? nil : note
        accountId = from?.id
        toAccountId = nil
        if type == .transfer {
            toAccountId = to?.id
        } else {
            let category = draft.category.trimmingCharacters(in: .whitespaces)
            let vendor = draft.vendor.trimmingCharacters(in: .whitespaces)
            self.category = category.isEmpty ? nil : category
            vendorName = vendor.isEmpty ? nil : vendor
        }
    }

    private enum Keys: String, CodingKey {
        case name, type, amount, category, description
        case paymentMethod = "payment_method"
        case vendorName = "vendor_name"
        case accountId = "account_id"
        case toAccountId = "to_account_id"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(name, forKey: .name)
        try container.encode(type, forKey: .type)
        try container.encode(paymentMethod, forKey: .paymentMethod)
        try container.encodeIfPresent(amount, forKey: .amount)
        try container.encodeIfPresent(category, forKey: .category)
        try container.encodeIfPresent(vendorName, forKey: .vendorName)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(accountId, forKey: .accountId)
        try container.encodeIfPresent(toAccountId, forKey: .toAccountId)
    }
}
