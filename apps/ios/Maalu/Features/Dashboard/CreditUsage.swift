import Foundation

struct CreditUsage {
    let owed: Decimal
    let limit: Decimal
    let percent: Int

    var isHigh: Bool { percent >= 80 }

    /// What is owed against a card's limit, or nil when it has none.
    init?(balance: String, limit: String?) {
        guard let limit = limit.flatMap(Money.decimal), limit > 0, let balance = Money.decimal(balance) else { return nil }
        owed = balance < 0 ? -balance : 0
        self.limit = limit
        var exact = owed * 100 / limit
        var rounded = Decimal()
        NSDecimalRound(&rounded, &exact, 0, .plain)
        percent = NSDecimalNumber(decimal: rounded).intValue
    }
}
