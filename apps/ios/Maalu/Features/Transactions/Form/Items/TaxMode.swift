import Foundation

/// How the prices on a receipt relate to GST.
enum TaxMode: String, CaseIterable, Identifiable {
    case none, included, excluded

    var id: Self { self }

    var title: LocalizedStringResource {
        switch self {
        case .none: "No GST"
        case .included: "Prices include GST"
        case .excluded: "Prices exclude GST"
        }
    }
}
