import Foundation


/// What a salary's rules would send on, or, once it has been split, what was made.
struct SalarySplitPlan: Decodable, Hashable {
    let salaryId: String
    let title: String
    let salaryDate: String?
    let amount: String
    let currency: String
    let accountId: String
    let accountName: String
    /// Any of the split has been made.
    let applied: Bool
    /// Every rule's line has been made: nothing is left to approve.
    let complete: Bool
    let items: [SalarySplitItem]
    /// The lines still to make that can be made, added up.
    let total: String
    /// What stays in the account.
    let left: String
    /// What is made and the lines to make pass the salary.
    let over: Bool
    let made: [SalarySplitMade]

    /// The lines left to approve: they can be made and have not been.
    var waiting: [SalarySplitItem] { items.filter { $0.ok && !$0.done } }
    var blocked: [SalarySplitItem] { items.filter { !$0.ok } }
    var madeTotal: Decimal { made.reduce(0) { $0 + (Money.decimal($1.amount) ?? 0) } }
}
