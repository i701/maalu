import Foundation

struct MoreItem: Identifiable, Hashable {
    let id: String
    let title: LocalizedStringResource
    let systemImage: String

    static func == (lhs: MoreItem, rhs: MoreItem) -> Bool { lhs.id == rhs.id }

    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
