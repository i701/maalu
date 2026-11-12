import Foundation

/// The body for `PATCH /categories/kind`: several categories at once, all to the same kind
/// (an explicit null clears it).
struct CategoryKindRequest: Encodable {
    var ids: [String]
    var kind: CategoryKind?

    private enum Keys: String, CodingKey {
        case ids, kind
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(ids, forKey: .ids)
        try container.encode(kind, forKey: .kind)
    }
}
