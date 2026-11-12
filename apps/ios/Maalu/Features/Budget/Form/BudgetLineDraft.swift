import Foundation

struct BudgetLineDraft: Equatable {
    var name = ""
    var amount: Decimal?
    var categoryIDs: Set<String> = []
    var rollover = false

    init() {}

    init(editing line: BudgetLine) {
        name = line.name
        amount = Money.decimal(line.amount)
        categoryIDs = Set(line.categories.map(\.id))
        rollover = line.rollover
    }

    /// The first thing wrong with the draft, or nil when it can be sent. The server checks everything again.
    var problem: LocalizedStringResource? {
        if name.trimmingCharacters(in: .whitespaces).isEmpty { return "Give the limit a name." }
        guard let amount, amount > 0 else { return "Enter an amount above zero." }
        if categoryIDs.isEmpty { return "Choose at least one category." }
        return nil
    }

    func createRequest() -> BudgetLineRequest {
        BudgetLineRequest(
            name: name.trimmingCharacters(in: .whitespaces),
            amount: amount.map(Money.string),
            categoryIds: categoryIDs.sorted(),
            rollover: rollover
        )
    }

    /// Only what changed, so a limit's dates and moves are never touched by an edit of its name.
    func patchRequest(from original: BudgetLineDraft) -> BudgetLineRequest {
        BudgetLineRequest(
            name: name != original.name ? name.trimmingCharacters(in: .whitespaces) : nil,
            amount: amount != original.amount ? amount.map(Money.string) : nil,
            categoryIds: categoryIDs != original.categoryIDs ? categoryIDs.sorted() : nil,
            rollover: rollover != original.rollover ? rollover : nil
        )
    }
}
