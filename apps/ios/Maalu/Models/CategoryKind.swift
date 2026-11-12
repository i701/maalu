import Foundation

/// How necessary spending in a category is. A category with no kind is "unsorted".
enum CategoryKind: String, Codable, CaseIterable, Identifiable {
    case need, want

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .need: "Need"
        case .want: "Want"
        }
    }
}
