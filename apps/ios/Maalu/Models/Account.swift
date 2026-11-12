struct Account: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let group: AccountGroup
    let currency: String
    let balance: String
    let baseBalance: String
    let openingAmount: String
    let exchangeRate: String
    let autoRate: Bool
    let bank: String?
    let accountNumber: String?
    let description: String?
    let creditLimit: String?
    let statementDay: Int?
    let dueDay: Int?
    let excludeFromStats: Bool
    let spendable: Bool?
    let archivedAt: String?
    let transactionCount: Int

    var isArchived: Bool { archivedAt != nil }
}
