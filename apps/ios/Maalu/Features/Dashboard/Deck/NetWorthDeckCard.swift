import SwiftUI

/// The third deck card: what you are worth, its line over the month, and the way into what moved it.
struct NetWorthDeckCard: View {
    let summary: AccountSummary
    let trend: [BalancePoint]

    var body: some View {
        DeckCardFrame(color: .accentGreen) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Net worth")
                    .font(.subheadline.weight(.medium))
                    .opacity(0.8)
                HStack(alignment: .center, spacing: 12) {
                    MoneyText(summary.total, currency: summary.currency)
                        .font(.largeTitle)
                        .fontWeight(.semibold)
                        .allowsHitTesting(false)
                        .layoutPriority(1)
                    if trend.count > 1 {
                        DeckSparkline(points: trend)
                            .frame(minWidth: 60, maxWidth: 140)
                            .frame(height: 36)
                    }
                }
                Spacer(minLength: 4)
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Assets \(MoneyFormat.string(summary.assets, currency: summary.currency))")
                        Text("Liabilities \(MoneyFormat.string(summary.liabilities, currency: summary.currency))")
                    }
                    .font(.footnote)
                    .opacity(0.8)
                    Spacer()
                    NavigationLink(value: DashboardRoute.netWorth) { DeckPill(title: String(localized: "What moved it"), systemImage: "arrow.up.right") }
                        .buttonStyle(.plain)
                }
            }
        }
    }
}
