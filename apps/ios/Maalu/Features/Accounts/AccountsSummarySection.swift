import SwiftUI

/// What you are worth: the net figure large, and what you own against what you owe as one bar, on the same card as the Dashboard's net worth, in this screen's green.
struct AccountsSummarySection: View {
    let summary: AccountSummary

    var body: some View {
        DeckCardFrame(color: .accentGreen) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Net worth")
                    .font(.subheadline.weight(.medium))
                    .opacity(0.8)
                MoneyText(summary.total, currency: summary.currency)
                    .font(.largeTitle)
                    .fontWeight(.semibold)
                    .allowsHitTesting(false)
                Spacer(minLength: 4)
                DeckIncomeBar(income: abs(Money.decimal(summary.assets) ?? 0), spent: abs(Money.decimal(summary.liabilities) ?? 0))
                HStack(alignment: .top) {
                    DeckLegend(title: "Assets", amount: Money.decimal(summary.assets) ?? 0, currency: summary.currency)
                    Spacer()
                    DeckLegend(title: "Liabilities", amount: Money.decimal(summary.liabilities) ?? 0, currency: summary.currency)
                }
            }
        }
    }
}
