import Foundation

/// A limit money can come from: another monthly limit and what it has left this period.
struct MoveSource: Identifiable {
    let line: BudgetLine
    let left: Decimal

    var id: String { line.id }
    var isUsable: Bool { left > 0 }

    /// The limits money can come from for `lineID`, most left first. One with nothing left is listed but cannot be chosen.
    static func sources(in budget: Budget, for lineID: String) -> [MoveSource] {
        budget.lines
            .filter { $0.id != lineID }
            .map { MoveSource(line: $0, left: Money.decimal($0.available) ?? 0) }
            .sorted { $0.left > $1.left }
    }
}
