import Foundation

enum IntervalUnit: String, Codable, CaseIterable, Identifiable {
    case week, month, year

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .week: "Weeks"
        case .month: "Months"
        case .year: "Years"
        }
    }

    /// "every month", "every 3 weeks".
    func every(_ count: Int) -> LocalizedStringResource {
        switch self {
        case .week: count == 1 ? "every week" : "every \(count) weeks"
        case .month: count == 1 ? "every month" : "every \(count) months"
        case .year: count == 1 ? "every year" : "every \(count) years"
        }
    }
}
