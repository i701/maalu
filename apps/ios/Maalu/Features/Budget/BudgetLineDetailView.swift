import SwiftUI

struct BudgetLineDetailView: View {
    let line: BudgetLine
    let currency: String

    var body: some View {
        List {
            Section { BudgetLineRow(line: line, currency: currency) }
            Section {
                fact("Limit", MoneyFormat.string(line.amount, currency: currency))
                if let carried = nonZero(line.carried) { fact("Carried in", MoneyFormat.string(carried, currency: currency)) }
                if let movedIn = nonZero(line.movedIn) { fact("Moved in", MoneyFormat.string(movedIn, currency: currency)) }
                if let movedOut = nonZero(line.movedOut) { fact("Moved out", MoneyFormat.string(movedOut, currency: currency)) }
                fact("Categories", line.categories.map(\.name).formatted())
                if line.rollover { fact("Carries over", String(localized: "Yes")) }
                if let kind = line.kind { fact("Kind", kind == "need" ? String(localized: "Need") : String(localized: "Want")) }
            }
        }
        .navigationTitle(line.name)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func fact(_ title: LocalizedStringKey, _ value: String) -> some View {
        LabeledContent(title, value: value)
    }

    private func nonZero(_ amount: String) -> String? {
        (Money.decimal(amount) ?? 0) == 0 ? nil : amount
    }
}
