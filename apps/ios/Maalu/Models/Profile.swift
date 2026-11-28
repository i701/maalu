struct Profile: Decodable {
    /// What to call the person; nil until they have set one.
    let name: String?
    let baseCurrency: String
    let defaultAccountId: String?
    let compactNumbers: Bool
}
