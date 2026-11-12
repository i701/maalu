struct FixedBudgetLine: Decodable, Identifiable {
    let id: String
    let name: String
    let activity: String
    let amount: String
    let percent: Int
    let status: String
    let state: String
    let endDate: String

    var isRunning: Bool { state == "active" }
}
