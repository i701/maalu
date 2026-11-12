import Foundation

struct TransactionTotals: Decodable {
    let currency: String
    let income: String
    let expense: String

    var incomeValue: Decimal { Money.decimal(income) ?? 0 }
    var expenseValue: Decimal { Money.decimal(expense) ?? 0 }
    var kept: Decimal { incomeValue - expenseValue }
}
