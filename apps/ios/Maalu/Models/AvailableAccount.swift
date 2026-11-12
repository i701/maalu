struct AvailableAccount: Decodable, Identifiable {
    let id: String
    let name: String
    let group: String
    let balance: String
}
