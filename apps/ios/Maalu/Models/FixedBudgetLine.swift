struct FixedBudgetLine: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let activity: String
    let amount: String
    let available: String
    let percent: Int
    let status: String
    let state: String
    let startDate: String
    let endDate: String
    let daysLeft: Int?
    let kind: String?
    let categories: [BudgetCategoryRef]

    var isRunning: Bool { state == "active" }
}
