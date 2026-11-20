import SwiftUI

/// What was kept this month, how spending moved against last month, and income against spending.
struct MonthSummarySection: View {
    let totals: TransactionTotals
    let previous: TransactionTotals?

    var body: some View {
        CardSection {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Kept this month")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    MoneyText(totals.kept, currency: totals.currency)
                        .font(.largeTitle)
                        .foregroundStyle(totals.kept < 0 ? Color.red : Color.primary)
                }
                if let change = SpendingChange(current: totals.expenseValue, previous: previous?.expenseValue) {
                    SpendingChangeChip(change: change)
                }
                IncomeSpendBar(income: totals.incomeValue, spent: totals.expenseValue)
                HStack(alignment: .top) {
                    BarLegend(title: "Income", amount: totals.incomeValue, currency: totals.currency, color: .brand)
                    Spacer()
                    BarLegend(title: "Spent", amount: totals.expenseValue, currency: totals.currency, color: .brand.opacity(0.3))
                }
            }
            .padding(.vertical, 6)
        } header: {
            SectionTitle("Income and spending")
        }
    }
}
