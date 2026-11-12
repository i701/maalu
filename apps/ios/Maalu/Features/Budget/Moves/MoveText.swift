import Foundation

enum MoveText {
    /// A move in words from one limit's side: "+MVR 600.00 from Dining", "−MVR 600.00 to Groceries" or "+MVR 300.00 added".
    /// Nil when the move does not touch that limit.
    static func describe(_ move: BudgetMove, from lineID: String, currency: String) -> String? {
        let amount = MoneyFormat.string(move.amount, currency: currency)
        if move.toLine.id == lineID {
            if let from = move.fromLine { return String(localized: "+\(amount) from \(from.name)") }
            return String(localized: "+\(amount) added")
        }
        if move.fromLine?.id == lineID { return String(localized: "−\(amount) to \(move.toLine.name)") }
        return nil
    }

    /// A limit's history grouped by the period each move was for, newest period first, each keeping its newest-first order.
    static func byPeriod(_ moves: [BudgetMove]) -> [MovePeriod] {
        Dictionary(grouping: moves) { $0.periodStart ?? "" }
            .map { MovePeriod(start: $0.key, end: $0.value.first?.periodEnd ?? "", moves: $0.value) }
            .sorted { $0.start > $1.start }
    }
}
