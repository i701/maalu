import SwiftUI

/// The second deck card: what was kept this month, how spending moved against last month, and income against spending.
struct KeptDeckCard: View {
    let totals: TransactionTotals
    let previous: TransactionTotals?

    var body: some View {
        DeckCardFrame(color: .accentViolet) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Kept this month")
                        .font(.subheadline.weight(.medium))
                        .opacity(0.8)
                    Spacer()
                    if let change = SpendingChange(current: totals.expenseValue, previous: previous?.expenseValue) {
                        DeckPill(title: change.text, systemImage: change.symbol)
                    }
                }
                MoneyText(totals.kept, currency: totals.currency)
                    .font(.largeTitle)
                    .fontWeight(.semibold)
                    .allowsHitTesting(false)
                Spacer(minLength: 4)
                DeckIncomeBar(income: totals.incomeValue, spent: totals.expenseValue)
                HStack(alignment: .top) {
                    DeckLegend(title: "Income", amount: totals.incomeValue, currency: totals.currency)
                    Spacer()
                    DeckLegend(title: "Spent", amount: totals.expenseValue, currency: totals.currency)
                }
            }
        }
    }
}
