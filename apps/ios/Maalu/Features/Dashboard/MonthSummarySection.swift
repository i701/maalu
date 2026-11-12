import SwiftUI

struct MonthSummarySection: View {
    let totals: TransactionTotals
    let previous: TransactionTotals?

    var body: some View {
        Section {
            LabeledContent("Income") { MoneyText(totals.incomeValue, currency: totals.currency) }
            LabeledContent {
                MoneyText(totals.expenseValue, currency: totals.currency)
            } label: {
                Text("Spent")
                if let change = spendingChange {
                    Text(change).font(.subheadline).foregroundStyle(.secondary)
                }
            }
            LabeledContent("Kept") { MoneyText(totals.kept, currency: totals.currency) }
        } header: {
            Text("Income and spending")
        }
    }

    private var spendingChange: String? {
        guard let previous, let change = PercentChange.between(totals.expenseValue, previous.expenseValue) else { return nil }
        let rounded = Int(change.rounded())
        if rounded == 0 { return String(localized: "Same as last month") }
        return rounded > 0 ? String(localized: "Up \(rounded)% on last month") : String(localized: "Down \(-rounded)% on last month")
    }
}
