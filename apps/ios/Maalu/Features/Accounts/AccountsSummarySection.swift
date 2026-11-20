import SwiftUI

/// What you are worth: the net figure large, and what you own against what you owe as one bar, on a card with the same shadow as the Dashboard's. No side inset: the list has already inset its sections, so the card is as wide as they are.
struct AccountsSummarySection: View {
    let summary: AccountSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            AmountRow {
                Text("Net worth")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } amount: {
                MoneyText(summary.total, currency: summary.currency)
                    .font(.largeTitle)
            }
            IncomeSpendBar(income: abs(Money.decimal(summary.assets) ?? 0), spent: abs(Money.decimal(summary.liabilities) ?? 0))
            HStack(alignment: .top) {
                BarLegend(title: "Assets", amount: Money.decimal(summary.assets) ?? 0, currency: summary.currency, color: .brand)
                Spacer()
                BarLegend(title: "Liabilities", amount: Money.decimal(summary.liabilities) ?? 0, currency: summary.currency, color: .brand.opacity(0.3))
            }
        }
        .padding(Spacing.card)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(elevation: 3)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 12, trailing: 0))
    }
}
