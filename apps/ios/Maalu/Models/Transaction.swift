import Foundation

struct Transaction: Decodable, Identifiable, Hashable {
    let id: String
    let type: TransactionType
    let amount: String
    let toAmount: String?
    let currency: String
    let exchangeRate: String
    let baseAmount: String
    let category: String
    let description: String?
    let transactionDate: String
    let transactionTime: String?
    let planned: Bool
    let paymentMethod: PaymentMethod
    let account: AccountRef?
    let toAccount: AccountRef?
    let vendor: NamedRef?
    let card: NamedRef?
    let subscription: NamedRef?
    let tags: [NamedRef]
    let refundOf: RefundOf?
    let refundedAmount: String
    let splits: [TransactionSplit]
    let adjustment: Bool?
    let deletedAt: String?

    var isRefund: Bool { refundOf != nil }

    /// The day the transaction was deleted, as a calendar date (the API sends a full timestamp).
    var deletedDay: String? {
        guard let deletedAt else { return nil }
        return String(deletedAt.prefix(10))
    }

    /// Refunds, balance adjustments and purchases with items have their own rules on the web.
    var canEdit: Bool { !isRefund && adjustment != true && splits.isEmpty }

    var title: String {
        if let vendor { return vendor.name }
        if let description, !description.isEmpty { return description }
        return type == .transfer ? String(localized: "Transfer") : category
    }

    var subtitle: String {
        if type == .transfer {
            return [account?.name, toAccount?.name].compactMap { $0 }.joined(separator: " → ")
        }
        var prefix = isRefund ? [String(localized: "Refund")] : []
        if planned { prefix.append(String(localized: "Planned")) }
        return (prefix + [category, account?.name].compactMap { $0 }).joined(separator: " · ")
    }

    /// Spending is negative, money in is positive, and a transfer has no direction.
    var signedAmount: Decimal? {
        guard let value = Money.decimal(amount) else { return nil }
        return type == .expense ? -value : value
    }
}
