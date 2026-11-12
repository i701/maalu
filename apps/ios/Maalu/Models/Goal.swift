struct Goal: Decodable, Identifiable {
    let id: String
    let name: String
    let currency: String
    let saved: String
    let targetAmount: String
    let percent: Int
    let reached: Bool
}
