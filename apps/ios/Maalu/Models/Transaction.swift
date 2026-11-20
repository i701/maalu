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
    let categoryIsSalary: Bool?
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
    /// The group it is bundled in, if any; at most one.
    let group: NamedRef?
    let latitude: String?
    let longitude: String?
    let place: String?

    var isRefund: Bool { refundOf != nil }
    /// An expense can become the first payment of a subscription, unless it belongs to one.
    var canMakeSubscription: Bool { type == .expense && subscription == nil }
    /// Posted pay (the Salary category) in an account can be split between accounts and goals by the rules.
    var canSplitSalary: Bool { type == .income && categoryIsSalary == true && account != nil && !planned }
    var isRefundable: Bool { RefundRules.canRefund(self) }
    var isLinkableAsRefund: Bool { RefundRules.canLink(self) }

    /// Where it was marked on the map, if it was.
    var location: TransactionLocation? {
        guard let latitude, let longitude else { return nil }
        return TransactionLocation(latitude: latitude, longitude: longitude, place: place ?? "")
    }

    /// The day the transaction was deleted, as a calendar date (the API sends a full timestamp).
    var deletedDay: String? {
        guard let deletedAt else { return nil }
        return String(deletedAt.prefix(10))
    }

    /// Refunds and balance adjustments have their own rules on the web.
    var canEdit: Bool { !isRefund && adjustment != true }
    var canEditRefund: Bool { isRefund && adjustment != true }

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
