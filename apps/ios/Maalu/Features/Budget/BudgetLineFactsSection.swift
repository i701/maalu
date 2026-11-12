import SwiftUI

struct BudgetLineFactsSection: View {
    let line: BudgetLine
    let currency: String

    var body: some View {
        Section {
            LabeledContent("Limit", value: MoneyFormat.string(line.amount, currency: currency))
            if let carried = nonZero(line.carried) { LabeledContent("Carried in", value: MoneyFormat.string(carried, currency: currency)) }
            if let movedIn = nonZero(line.movedIn) { LabeledContent("Moved in", value: MoneyFormat.string(movedIn, currency: currency)) }
            if let movedOut = nonZero(line.movedOut) { LabeledContent("Moved out", value: MoneyFormat.string(movedOut, currency: currency)) }
            LabeledContent("Categories", value: line.categories.map(\.name).formatted())
            if line.rollover { LabeledContent("Carries over", value: String(localized: "Yes")) }
            if let kind = line.kind { LabeledContent("Kind", value: kind == "need" ? String(localized: "Need") : String(localized: "Want")) }
        }
    }

    private func nonZero(_ amount: String) -> String? {
        (Money.decimal(amount) ?? 0) == 0 ? nil : amount
    }
}
