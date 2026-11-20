import Foundation

/// Refunds give money back for an earlier purchase: income that names the purchase (and, for one with items, the items given back).
/// Ported from the web's `lib/refund.ts`.
enum RefundRules {
    /// What is left to refund of a purchase or one of its items.
    static func left(_ amount: String, refunded: String?) -> Decimal {
        (Money.decimal(amount) ?? 0) - (refunded.flatMap(Money.decimal) ?? 0)
    }

    /// A planned purchase has not happened yet, so it cannot be given back.
    static func canRefund(_ transaction: Transaction) -> Bool {
        transaction.type == .expense && !transaction.planned && transaction.adjustment != true
            && left(transaction.amount, refunded: transaction.refundedAmount) > 0
    }

    /// Plain income could be linked to the purchase it gave money back for. Pay (the Salary category) never is.
    static func canLink(_ transaction: Transaction) -> Bool {
        transaction.type == .income && transaction.adjustment != true && !transaction.isRefund
            && transaction.categoryIsSalary != true && !transaction.planned
    }

    static func refunded(_ purchase: Transaction) -> Decimal {
        Money.decimal(purchase.refundedAmount) ?? 0
    }
}
