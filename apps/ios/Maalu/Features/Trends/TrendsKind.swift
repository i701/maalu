import Foundation

enum TrendsKind: String, CaseIterable, Identifiable {
    case spending, income

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .spending: "Spending"
        case .income: "Income"
        }
    }

    /// The `type` the API gives the rows of this kind.
    var type: String { self == .spending ? "expense" : "income" }
}
