import Foundation

enum PaymentMethod: String, Codable, CaseIterable, Identifiable {
    case cash
    case bankTransfer = "bank_transfer"
    case debitCard = "debit_card"
    case creditCard = "credit_card"
    case other

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .cash: "Cash"
        case .bankTransfer: "Bank transfer"
        case .debitCard: "Debit card"
        case .creditCard: "Credit card"
        case .other: "Other"
        }
    }

    /// What an account group suggests as the way of paying.
    static func suggested(forGroup group: String) -> PaymentMethod {
        switch group {
        case "cash": .cash
        case "accounts", "savings", "overdrafts": .bankTransfer
        case "card": .creditCard
        default: .other
        }
    }
}
