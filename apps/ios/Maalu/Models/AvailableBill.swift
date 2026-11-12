struct AvailableBill: Decodable, Identifiable {
    let id: String
    let title: String
    let amount: String
    let date: String
    let overdue: Bool
    let account: String?
    let subscription: String?
    let estimate: Bool?
    let transfer: Bool?
}
