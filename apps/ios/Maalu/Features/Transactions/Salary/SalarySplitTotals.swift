import Foundation

struct SalarySplitTotals: Equatable {
    /// The ticked lines added up, exactly.
    let total: Decimal
    /// What stays in the account.
    let left: Decimal
    /// More than the salary is being sent.
    let isOver: Bool
    /// A ticked line has an amount that is not a positive number.
    let isInvalid: Bool
    let count: Int

    /// `made` is what an automatic rule or an earlier approval already sent, which counts against the salary too.
    init(lines: [SalarySplitLine], salary: Decimal, made: Decimal = 0) {
        let ticked = lines.filter(\.isOn)
        total = ticked.reduce(0) { $0 + ($1.amount ?? 0) }
        left = salary - made - total
        isOver = made + total > salary
        isInvalid = ticked.contains { !$0.hasValidAmount }
        count = ticked.count
    }
}
