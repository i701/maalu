import Foundation

/// One category held across the two periods, biggest move first (in either direction).
struct CompareRow: Identifiable, Equatable {
    enum State {
        /// Had nothing before, `gone` has nothing now.
        case new, gone, both
    }

    let categoryId: String
    let category: String
    let parent: String?
    let color: String
    let state: State
    let change: CompareChange

    var id: String { categoryId }
    var name: String { parent.map { "\($0) › \(category)" } ?? category }

    static func rows(before: [CategoryTotal], now: [CategoryTotal], type: TransactionType) -> [CompareRow] {
        var rows: [String: CompareRow] = [:]
        for total in before where total.type == type.rawValue {
            rows[total.categoryId] = CompareRow(
                categoryId: total.categoryId, category: total.category, parent: total.parent, color: total.color,
                state: .gone, change: CompareChange(before: total.value, now: 0)
            )
        }
        for total in now where total.type == type.rawValue {
            let previous = rows[total.categoryId]
            rows[total.categoryId] = CompareRow(
                categoryId: total.categoryId, category: total.category, parent: total.parent, color: total.color,
                state: previous == nil ? .new : .both,
                change: CompareChange(before: previous?.change.before ?? 0, now: total.value)
            )
        }
        return rows.values.sorted { first, second in
            abs(first.change.change) != abs(second.change.change)
                ? abs(first.change.change) > abs(second.change.change)
                : first.category < second.category
        }
    }
}
