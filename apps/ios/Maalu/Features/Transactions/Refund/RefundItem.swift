import Foundation

/// One item of a purchase that a refund can give back, with the amount to give.
struct RefundItem: Identifiable, Equatable {
    /// The purchase's item this line gives back.
    let id: String
    let name: String
    let category: String
    let left: Decimal
    var amount: Decimal?
    var isOn: Bool

    /// Every item of the purchase, none ticked yet, each at what is left of it.
    static func toPick(from purchase: Transaction) -> [RefundItem] {
        purchase.splits.map {
            let left = RefundRules.left($0.amount, refunded: $0.refundedAmount)
            return RefundItem(id: $0.id, name: $0.name, category: $0.category, left: left, amount: left, isOn: false)
        }
    }

    /// The items an existing refund already gives back, whose amounts can change but which cannot be swapped.
    static func given(by refund: Transaction) -> [RefundItem] {
        refund.splits.map {
            let amount = Money.decimal($0.amount) ?? 0
            return RefundItem(id: $0.refundOfSplitId ?? $0.id, name: $0.name, category: $0.category, left: amount, amount: amount, isOn: true)
        }
    }

    static func total(_ items: [RefundItem]) -> Decimal {
        items.filter(\.isOn).reduce(0) { $0 + ($1.amount ?? 0) }
    }
}
