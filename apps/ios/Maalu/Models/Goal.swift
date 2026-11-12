struct Goal: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let currency: String
    let saved: String
    let targetAmount: String
    let remaining: String
    let percent: Int
    let reached: Bool
    let account: AccountRef?
    let monthlyAmount: String?
    let targetDate: String?
    let monthsLeft: Int?
    let neededPerMonth: String?
    let periodStatus: String?
    let periodPlanned: String?
    let periodContributed: String?
}
