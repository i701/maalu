import Foundation

struct RefundDraft {
    var amount: Decimal?
    var items: [RefundItem]
    var date: Date
    var time: Date?
    var rate: Decimal?
    var note: String
    var accountID: String?
    let hasItems: Bool
    /// What is left of the purchase; nil when changing a refund, whose room the server checks.
    let left: Decimal?
    let isEditing: Bool

    /// A new refund of `purchase`, in its currency, starting from its rate and account.
    init(purchase: Transaction) {
        let left = RefundRules.left(purchase.amount, refunded: purchase.refundedAmount)
        hasItems = !purchase.splits.isEmpty
        amount = hasItems ? nil : left
        items = RefundItem.toPick(from: purchase)
        date = .now
        rate = Money.decimal(purchase.exchangeRate)
        note = ""
        accountID = purchase.account?.id
        self.left = left
        isEditing = false
    }

    init(editing refund: Transaction) {
        hasItems = !refund.splits.isEmpty
        amount = Money.decimal(refund.amount)
        items = RefundItem.given(by: refund)
        let day = ISODate.date(refund.transactionDate) ?? .now
        date = day
        time = refund.transactionTime.flatMap { ClockTime.date($0, on: day) }
        rate = Money.decimal(refund.exchangeRate)
        note = refund.description ?? ""
        accountID = refund.account?.id
        left = nil
        isEditing = true
    }

    /// What is sent: the ticked items' total for a purchase with items.
    var total: Decimal? { hasItems ? RefundItem.total(items) : amount }

    var problem: LocalizedStringResource? {
        if hasItems {
            let ticked = items.filter(\.isOn)
            if ticked.isEmpty { return "Choose at least one item." }
            for item in ticked {
                guard let value = item.amount, value > 0 else { return "Enter an amount above zero for \(item.name)." }
                if !isEditing, value > item.left { return "\(item.name): that is more than is left to refund." }
            }
            return nil
        }
        guard let amount, amount > 0 else { return "Enter an amount above zero." }
        if let left, amount > left { return "That is more than is left to refund." }
        return nil
    }

    func request(purchaseID: String?, isForeign: Bool) -> RefundRequest {
        let note = note.trimmingCharacters(in: .whitespacesAndNewlines)
        return RefundRequest(
            purchaseID: purchaseID,
            amount: Money.string(total ?? 0),
            date: ISODate.string(date),
            time: time.map { ClockTime.string($0) },
            rate: isForeign ? rate.map(Money.string) : nil,
            note: note.isEmpty ? nil : note,
            accountID: accountID,
            lines: hasItems ? RefundLine.lines(items) : nil,
            isEditing: isEditing
        )
    }
}
