struct GroupRequest: Encodable {
    let name: String
    let note: String?
    /// Only when making one; a change leaves the members alone.
    let transactionIds: [String]?

    private enum Keys: String, CodingKey {
        case name, note
        case transactionIds = "transaction_ids"
    }

    /// Writes an empty note as null, which clears it on a change.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(name, forKey: .name)
        try container.encode(note, forKey: .note)
        try container.encodeIfPresent(transactionIds, forKey: .transactionIds)
    }
}
