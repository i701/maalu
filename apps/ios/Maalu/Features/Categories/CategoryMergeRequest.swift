struct CategoryMergeRequest: Encodable {
    var intoId: String

    private enum Keys: String, CodingKey {
        case intoId = "into_id"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(intoId, forKey: .intoId)
    }
}
