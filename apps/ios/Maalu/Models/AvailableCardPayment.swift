struct AvailableCardPayment: Decodable, Identifiable {
    let accountId: String
    let title: String
    let amount: String
    let date: String
    let overdue: Bool

    var id: String { accountId }
}
