import Foundation

struct BudgetLine: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let activity: String
    let amount: String
    let available: String
    let carried: String
    let movedIn: String
    let movedOut: String
    let rollover: Bool
    let percent: Int
    let status: String
    let kind: String?
    let runsFrom: String?
    let runsUntil: String?
    let categories: [BudgetCategoryRef]

    /// What the limit allows this period: its amount and what was carried in, plus what was moved in, less what was moved out.
    var allowed: Decimal {
        [amount, carried, movedIn].compactMap(Money.decimal).reduce(0, +) - (Money.decimal(movedOut) ?? 0)
    }
}
