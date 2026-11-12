import Foundation

enum CashFlowRange: Int, CaseIterable, Identifiable {
    case sixMonths = 6
    case twelveMonths = 12

    var id: Int { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .sixMonths: "6 months"
        case .twelveMonths: "12 months"
        }
    }
}
