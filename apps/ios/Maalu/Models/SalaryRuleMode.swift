import Foundation


enum SalaryRuleMode: String, Codable, CaseIterable, Identifiable {
    case percent, fixed

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .percent: "A share of the salary"
        case .fixed: "A fixed amount"
        }
    }
}
