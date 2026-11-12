import Foundation

enum SubscriptionStatus: String, Codable, CaseIterable, Identifiable {
    case active, paused, cancelled, completed

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .active: "Active"
        case .paused: "Paused"
        case .cancelled: "Cancelled"
        case .completed: "Completed"
        }
    }

    /// What a person may set: a completed plan is only ever the result of its last payment.
    static let choosable: [SubscriptionStatus] = [.active, .paused, .cancelled]
}
