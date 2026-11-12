struct BudgetMove: Decodable, Identifiable, Hashable {
    let id: String
    let amount: String
    let note: String?
    let createdAt: String
    let fromLine: NamedRef?
    let toLine: NamedRef
    let periodStart: String?
    let periodEnd: String?
    let undoneAt: String?
}
