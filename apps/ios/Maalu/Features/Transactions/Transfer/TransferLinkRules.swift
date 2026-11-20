import Foundation

/// Linking two entries into one transfer: a move of your own money entered twice becomes one transfer. The server finds the likely pairs
/// and does the merge. Ported from the web's `lib/transfer-link.ts`.
enum TransferLinkRules {
    /// Money that left an account, posted, not a correction, and nothing that would be lost (items) or contradicted (refunds).
    static func canBeExpenseSide(_ transaction: Transaction) -> Bool {
        transaction.type == .expense && transaction.account != nil && !transaction.planned && transaction.adjustment != true
            && transaction.splits.isEmpty && RefundRules.refunded(transaction) == 0
    }

    /// Money that arrived in an account, posted, and not a refund (money back for a purchase) or a correction.
    static func canBeIncomeSide(_ transaction: Transaction) -> Bool {
        transaction.type == .income && transaction.account != nil && !transaction.planned && transaction.adjustment != true && !transaction.isRefund
    }

    /// Whether a transaction could be half of a merged transfer at all, so its details offer to look for the other half.
    static func canLink(_ transaction: Transaction) -> Bool {
        canBeExpenseSide(transaction) || canBeIncomeSide(transaction)
    }

    /// The expense and the income of two entries, in that order, or nil when they are not that.
    static func pair(_ first: Transaction, _ second: Transaction) -> (expense: Transaction, income: Transaction)? {
        guard first.account?.id != second.account?.id else { return nil }
        if canBeExpenseSide(first), canBeIncomeSide(second) { return (first, second) }
        if canBeExpenseSide(second), canBeIncomeSide(first) { return (second, first) }
        return nil
    }

    /// "Merge with 1 matching entry", "Merge with 2 matching entries".
    static func mergeLabel(_ count: Int) -> String {
        count == 1 ? String(localized: "Merge with 1 matching entry") : String(localized: "Merge with \(count) matching entries")
    }

    /// "same day", "1 day apart", "2 days apart".
    static func daysApartText(_ days: Int) -> String {
        switch days {
        case 0: String(localized: "same day")
        case 1: String(localized: "1 day apart")
        default: String(localized: "\(days) days apart")
        }
    }

    /// What the confirmation says: where the money goes, what becomes of the two entries and what is dropped.
    static func sentence(expense: Transaction, income: Transaction) -> String {
        let out = MoneyFormat.string(expense.amount, currency: expense.currency)
        let from = expense.account?.name ?? ""
        let to = income.account?.name ?? ""
        let arriving = expense.currency == income.currency ? "" : String(localized: ", arriving as \(MoneyFormat.string(income.amount, currency: income.currency))")
        return String(localized: "Move \(out) from \(from) to \(to)\(arriving)? The expense becomes the transfer and the income goes to the trash. Balances stay as they are, and neither counts as spending or income any more. The expense's category and vendor are dropped, because transfers have none.")
    }

    static let linkedMessage = String(localized: "Made one transfer. The other entry is in the trash.")
}
