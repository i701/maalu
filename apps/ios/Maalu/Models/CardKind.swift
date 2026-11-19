import Foundation

/// A debit card spends from a bank account; a credit card has its own account, what you owe.
enum CardKind: String, Decodable {
    case debit, credit

    var title: LocalizedStringResource {
        switch self {
        case .debit: "Debit card"
        case .credit: "Credit card"
        }
    }

    /// The kind an account's cards are: its own group decides, and a loan or overdraft takes none.
    static func forAccount(in group: AccountGroup) -> CardKind? {
        if group == .card { return .credit }
        return group.isLiability ? nil : .debit
    }
}
