struct VendorRequest: Encodable, Equatable {
    let name: String
    let address: String?
    let contact: String?
    let isLocal: Bool?
    let currency: String?
    let defaultCategory: String?
    let defaultTags: [String]

    private enum Keys: String, CodingKey {
        case name, address, contact, currency
        case isLocal = "is_local"
        case defaultCategory = "default_category"
        case defaultTags = "default_tags"
    }

    /// Writes null for an empty field instead of leaving it out: on a change, null is what clears it.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(name, forKey: .name)
        try container.encode(address, forKey: .address)
        try container.encode(contact, forKey: .contact)
        try container.encode(isLocal, forKey: .isLocal)
        try container.encode(currency, forKey: .currency)
        try container.encode(defaultCategory, forKey: .defaultCategory)
        try container.encode(defaultTags, forKey: .defaultTags)
    }
}
