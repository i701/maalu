import SwiftUI

struct MoreItem: Identifiable, Hashable {
    let id: String
    let title: LocalizedStringResource
    let systemImage: String
    /// The colour of its icon on the More screen.
    let tint: Color

    static func == (lhs: MoreItem, rhs: MoreItem) -> Bool { lhs.id == rhs.id }

    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
