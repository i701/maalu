import Foundation

extension TransactionTemplate {
    /// What a template fills in, as one line: "Expense · MVR 250.00 · Groceries · BML Current".
    var summary: String {
        var parts = [String(localized: type.title)]
        if let amount, let value = Money.decimal(amount) {
            parts.append(MoneyFormat.string(value, currency: currency))
        }
        if type == .transfer {
            if let account, let toAccount {
                parts.append("\(account.name) → \(toAccount.name)")
            }
        } else {
            if let category, !category.isEmpty { parts.append(category) }
            if let vendor, !vendor.isEmpty { parts.append(vendor) }
            if let account { parts.append(account.name) }
        }
        return parts.joined(separator: " · ")
    }
}
