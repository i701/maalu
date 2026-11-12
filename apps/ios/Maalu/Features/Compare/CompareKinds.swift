import Foundation

/// Needs, wants and not sorted held across two periods, as rows the compare tables can draw. A
/// kind with nothing in either period is left out.
enum CompareKinds {
    static func rows(before: [CategoryTotal], now: [CategoryTotal]) -> [CompareRow] {
        [CategoryKind.need, CategoryKind.want, nil].compactMap { kind in
            let beforeValue = sum(before, kind)
            let nowValue = sum(now, kind)
            if beforeValue == 0 && nowValue == 0 { return nil }
            let state: CompareRow.State = beforeValue == 0 ? .new : (nowValue == 0 ? .gone : .both)
            return CompareRow(
                categoryId: kind?.rawValue ?? "unsorted",
                category: name(kind),
                parent: nil,
                color: color(kind),
                state: state,
                change: CompareChange(before: beforeValue, now: nowValue)
            )
        }
    }

    private static func sum(_ rows: [CategoryTotal], _ kind: CategoryKind?) -> Decimal {
        rows
            .filter { $0.type == TransactionType.expense.rawValue && $0.kind == kind?.rawValue }
            .reduce(Decimal.zero) { $0 + $1.value }
    }

    private static func name(_ kind: CategoryKind?) -> String {
        switch kind {
        case .need: String(localized: "Needs")
        case .want: String(localized: "Wants")
        case nil: String(localized: "Not sorted")
        }
    }

    /// The accent names the web wears for each kind: needs blue, wants orange, the rest grey.
    private static func color(_ kind: CategoryKind?) -> String {
        switch kind {
        case .need: "blue"
        case .want: "orange"
        case nil: "slate"
        }
    }
}
