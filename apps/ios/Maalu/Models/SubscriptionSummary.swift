struct SubscriptionSummary: Decodable {
    let activeCount: Int
    let monthlyBaseTotal: String
    let currency: String
}
