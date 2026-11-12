import Foundation

enum AccountHistoryRange: Int, CaseIterable, Identifiable {
    case month = 30
    case quarter = 90
    case year = 365

    var id: Int { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .month: "30 days"
        case .quarter: "90 days"
        case .year: "1 year"
        }
    }
}
