import SwiftUI

/// The second deck card: what was kept this month, how spending moved against last month, and a donut of the income kept against spent.
struct KeptDeckCard: View {
    let totals: TransactionTotals
    let previous: TransactionTotals?
    /// The months loaded, oldest first, ending with the one shown; the last few are drawn as bars.
    let months: [MonthlyPoint]

    var body: some View {
        DeckCardFrame(color: .brand.mix(with: .cyan, by: 0.4)) {
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
                if let split = KeptSplit(income: totals.incomeValue, spent: totals.expenseValue) {
                    Text("of \(MoneyFormat.string(totals.incomeValue, currency: totals.currency)) income")
                        .font(.footnote)
                        .opacity(0.8)
                    DeckDonut(first: DonutPart(title: "Kept", share: split.keptShare, amount: max(totals.kept, 0)), second: DonutPart(title: "Spent", share: split.spentShare, amount: totals.expenseValue), currency: totals.currency, bars: bars)
                        .padding(.top, 8)
                }
            }
        }
    }

    /// What each of the last six months kept, the one shown solid.
    private var bars: [MiniBar] {
        let recent = months.suffix(6)
        return recent.enumerated().map { index, month in
            MiniBar(
                label: (month.start ?? .distantPast).formatted(.dateTime.month(.narrow)) + String(repeating: "\u{200B}", count: index),
                value: NSDecimalNumber(decimal: month.kept).doubleValue,
                isHighlighted: index == recent.count - 1
            )
        }
    }
}
