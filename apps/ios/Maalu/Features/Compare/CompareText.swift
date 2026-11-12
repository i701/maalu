import Foundation

/// One plain sentence on how spending moved and which categories did it, for the top of the page.
/// `against` is what it is held against ("October 2026"). Only categories that moved the same way
/// as the total are named, since the others pulled the other way.
enum CompareText {
    static func spendingSentence(expense: CompareChange, rows: [CompareRow], against: String, currency: String) -> String {
        if expense.now == 0 && expense.before == 0 {
            return String(localized: "There is no spending in either period.")
        }
        let moved = expense.change
        if moved == 0 {
            return String(localized: "Spending is the same as in \(against).")
        }
        let up = moved > 0
        let share = expense.percentText.map { " (\($0))" } ?? ""
        let amount = MoneyFormat.string(abs(moved), currency: currency)
        let head = up
            ? String(localized: "Spending is up \(amount)\(share) on \(against).")
            : String(localized: "Spending is down \(amount)\(share) on \(against).")
        let moves = biggestMoves(rows: rows)
        let named = (up ? moves.up : moves.down).map { row in
            "\(row.category) \(up ? "+" : "-")\(MoneyFormat.string(abs(row.change.change), currency: currency))"
        }.joined(separator: ", ")
        return named.isEmpty ? head : String(localized: "\(head) Most of it: \(named).")
    }

    /// The categories that moved most, as a short list each way. Rows with no change are left out.
    static func biggestMoves(rows: [CompareRow], count: Int = 3) -> (up: [CompareRow], down: [CompareRow]) {
        (
            Array(rows.filter { $0.change.change > 0 }.prefix(count)),
            Array(rows.filter { $0.change.change < 0 }.prefix(count))
        )
    }
}
