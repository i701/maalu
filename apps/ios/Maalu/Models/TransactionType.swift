import Foundation

enum TransactionType: String, Codable, CaseIterable, Identifiable {
    case income, expense, transfer

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .income: "Income"
        case .expense: "Expense"
        case .transfer: "Transfer"
        }
    }
}
