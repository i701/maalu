import Foundation

struct Transaction: Decodable, Identifiable, Hashable {
    let id: String
    let type: TransactionType
    let amount: String
    let toAmount: String?
    let currency: String
    let category: String
    let description: String?
    let transactionDate: String
    let planned: Bool
    let account: NamedRef?
    let toAccount: NamedRef?
    let vendor: NamedRef?
    let refundOf: RefundOf?

    var isRefund: Bool { refundOf != nil }

    var title: String {
        if let vendor { return vendor.name }
        if let description, !description.isEmpty { return description }
        return type == .transfer ? String(localized: "Transfer") : category
    }

    var subtitle: String {
        if type == .transfer {
            return [account?.name, toAccount?.name].compactMap { $0 }.joined(separator: " → ")
        }
        return [category, account?.name].compactMap { $0 }.joined(separator: " · ")
    }

    /// Spending is negative, money in is positive, and a transfer has no direction.
    var signedAmount: Decimal? {
        guard let value = Money.decimal(amount) else { return nil }
        return type == .expense ? -value : value
    }
}
