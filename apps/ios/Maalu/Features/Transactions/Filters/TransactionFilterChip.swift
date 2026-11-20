import Foundation

/// One active filter, shown above the list so it is known without opening the Filters sheet.
struct TransactionFilterChip: Identifiable, Equatable {
    enum Kind: Hashable {
        case type, planned, dates, account, category, card, method, kind, amount
        case tag(String)
    }

    let kind: Kind
    let title: String

    var id: Kind { kind }
}
