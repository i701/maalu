struct Profile: Decodable {
    let baseCurrency: String
    let defaultAccountId: String?
    let compactNumbers: Bool
    let dashboardOrder: [String]?
}
