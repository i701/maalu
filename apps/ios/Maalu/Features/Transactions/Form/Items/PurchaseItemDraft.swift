import Foundation

/// One item as typed. An item from a saved purchase keeps its exact line total and tax until its quantity or price is changed.
struct PurchaseItemDraft: Identifiable, Equatable {
    let id = UUID()
    var name = ""
    var quantity: Decimal? = 1 {
        didSet { unlock() }
    }
    /// The price of one, as typed.
    var price: Decimal? {
        didSet { unlock() }
    }
    var category = ""
    private(set) var lockedAmount: Decimal?
    private(set) var lockedTax: Decimal?

    init() {}

    /// From a saved item: its exact total is kept, and the price of one is shown for reference.
    init(saved item: TransactionSplit) {
        name = item.name
        category = item.category
        let quantity = Money.decimal(item.quantity) ?? 1
        let amount = Money.decimal(item.amount) ?? 0
        self.quantity = quantity
        price = quantity > 0 ? Self.rounded(amount / quantity, places: 4) : amount
        lockedAmount = amount
        lockedTax = item.taxAmount.flatMap(Money.decimal)
    }

    /// Its line total (tax included) and the tax in it, or nil while the quantity or price is missing.
    func line(mode: TaxMode, rate: Decimal?) -> (amount: Decimal, tax: Decimal?)? {
        if let lockedAmount { return (lockedAmount, lockedTax) }
        guard let quantity, let price, quantity > 0, price > 0 else { return nil }
        let base = Self.rounded(Self.rounded(quantity, places: 3) * Self.rounded(price, places: 4), places: 4)
        guard mode != .none else { return (base, nil) }
        guard let rate, rate > 0 else { return nil }
        switch mode {
        case .included: return (base, Self.rounded(base * rate / (100 + rate), places: 4))
        case .excluded:
            let tax = Self.rounded(base * rate / 100, places: 4)
            return (base + tax, tax)
        case .none: return (base, nil)
        }
    }

    private mutating func unlock() {
        lockedAmount = nil
        lockedTax = nil
    }

    /// Half up, as the web and Android round a line.
    static func rounded(_ value: Decimal, places: Int) -> Decimal {
        var value = value
        var result = Decimal()
        NSDecimalRound(&result, &value, places, .plain)
        return result
    }
}
