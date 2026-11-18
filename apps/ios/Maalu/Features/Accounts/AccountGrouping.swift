import Foundation

enum AccountGrouping: String, CaseIterable, Identifiable {
    case type, bank

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .type: "By type"
        case .bank: "By bank"
        }
    }
}
