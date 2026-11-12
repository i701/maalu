struct Account: Decodable, Identifiable {
    let id: String
    let name: String
    let group: String
    let currency: String
    let balance: String
    let bank: String?
}
