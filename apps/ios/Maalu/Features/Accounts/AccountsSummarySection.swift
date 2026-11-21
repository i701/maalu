import SwiftUI

/// What you are worth: the net figure large, and a donut of what you own against what you owe, flat on the page like the Dashboard's summaries.
struct AccountsSummarySection: View {
    let summary: AccountSummary
    /// The accounts shown, for the bars of what each type holds.
    let accounts: [Account]

    private var assets: Decimal { abs(Money.decimal(summary.assets) ?? 0) }
    private var liabilities: Decimal { abs(Money.decimal(summary.liabilities) ?? 0) }

    var body: some View {
        DeckCardFrame(color: .brand) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Net worth")
                    .font(.subheadline.weight(.medium))
                    .opacity(0.8)
                MoneyText(summary.total, currency: summary.currency)
                    .font(.largeTitle)
                    .fontWeight(.semibold)
                    .allowsHitTesting(false)
                // the owed share of everything held and owed: assets are the rest
                if let split = KeptSplit(income: assets + liabilities, spent: liabilities) {
                    DeckDonut(
                        first: DonutPart(title: "Assets", share: split.keptShare, amount: assets),
                        second: DonutPart(title: "Liabilities", share: split.spentShare, amount: liabilities),
                        currency: summary.currency,
                        bars: bars
                    )
                    .padding(.top, 8)
                }
            }
        }
        .environment(\.deckIsFlat, true)
        .padding(.horizontal, Spacing.card)
        .padding(.vertical, 8)
    }

    /// What each type of account holds in the base currency, the biggest solid; what is owed counts as the amount owed.
    private var bars: [MiniBar] {
        let held = AccountGroup.allCases.compactMap { group -> (String, Double)? in
            let owned = accounts.filter { $0.group == group }
            guard !owned.isEmpty else { return nil }
            let total = owned.reduce(Decimal.zero) { $0 + abs(Money.decimal($1.baseBalance) ?? 0) }
            return (String(localized: group.title).prefix(1).uppercased(), NSDecimalNumber(decimal: total).doubleValue)
        }
        let biggest = held.map(\.1).max() ?? 0
        return held.enumerated().map { index, item in
            MiniBar(label: item.0 + String(repeating: "\u{200B}", count: index), value: item.1, isHighlighted: item.1 == biggest)
        }
    }
}
