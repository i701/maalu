struct AvailableReserve: Decodable, Identifiable {
    let goalId: String
    let name: String
    let amount: String

    var id: String { goalId }
}
