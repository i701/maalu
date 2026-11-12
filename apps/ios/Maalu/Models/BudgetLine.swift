struct BudgetLine: Decodable, Identifiable {
    let id: String
    let name: String
    let activity: String
    let amount: String
    let percent: Int
    let status: String
}
