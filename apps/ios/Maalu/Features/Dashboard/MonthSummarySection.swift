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
                    legend("Income", amount: totals.incomeValue, color: .brand)
                    Spacer()
                    legend("Spent", amount: totals.expenseValue, color: .brand.opacity(0.3))
                }
            }
            .padding(.vertical, 6)
        } header: {
            SectionTitle("Income and spending")
        }
    }

    private func legend(_ title: LocalizedStringKey, amount: Decimal, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Label {
                Text(title).foregroundStyle(.secondary)
            } icon: {
                Circle().fill(color).frame(width: 8, height: 8)
            }
            .font(.subheadline)
            MoneyText(amount, currency: totals.currency)
                .font(.headline)
        }
    }
}
