import Foundation

enum NeedsWantsFilter: String, CaseIterable, Identifiable {
    case need, want, unsorted

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .need: "Needs"
        case .want: "Wants"
        case .unsorted: "Not sorted"
        }
    }
}
