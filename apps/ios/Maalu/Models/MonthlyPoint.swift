import Foundation

struct MonthlyPoint: Decodable, Identifiable {
    let month: String
    let income: String
    let expense: String

    var id: String { month }

    var start: Date? { ISODate.date(month + "-01") }
    var incomeValue: Decimal { Money.decimal(income) ?? 0 }
    var expenseValue: Decimal { Money.decimal(expense) ?? 0 }

    /// Income less spending; refunds are already taken off spending, so a month can keep more than it earned.
    var kept: Decimal { incomeValue - expenseValue }
}
