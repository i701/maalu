import Foundation

/// Income, spending and what was kept in each period, and how each moved. Refunds are already
/// taken off spending by the API, so spending can be below what was bought.
struct CompareTotals: Equatable {
    let income: CompareChange
    let expense: CompareChange
    let kept: CompareChange

    static func make(before: [CategoryTotal], now: [CategoryTotal]) -> CompareTotals {
        let beforeIncome = total(before, .income)
        let beforeExpense = total(before, .expense)
        let nowIncome = total(now, .income)
        let nowExpense = total(now, .expense)
        return CompareTotals(
            income: CompareChange(before: beforeIncome, now: nowIncome),
            expense: CompareChange(before: beforeExpense, now: nowExpense),
            kept: CompareChange(before: beforeIncome - beforeExpense, now: nowIncome - nowExpense)
        )
    }

    private static func total(_ rows: [CategoryTotal], _ type: TransactionType) -> Decimal {
        rows.filter { $0.type == type.rawValue }.reduce(Decimal.zero) { $0 + $1.value }
    }
}
