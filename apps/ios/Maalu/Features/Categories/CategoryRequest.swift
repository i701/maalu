import Foundation

/// The body for `POST /categories` and `PATCH /categories/{id}`: only the fields sent change.
/// A nil colour is left out (a new category gets the least used one, an edited one keeps its
/// own), while an explicit nil parent or kind clears it.
struct CategoryRequest: Encodable {
    var name: String
    var color: String?
    var parentId: String?
    var kind: CategoryKind?

    private enum Keys: String, CodingKey {
        case name, color
        case parentId = "parent_id"
        case kind
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(color, forKey: .color)
        try container.encode(parentId, forKey: .parentId)
        try container.encode(kind, forKey: .kind)
    }
}
